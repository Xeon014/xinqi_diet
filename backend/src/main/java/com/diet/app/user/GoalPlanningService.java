package com.diet.app.user;

import com.diet.domain.metric.BodyMetricRecord;
import com.diet.domain.metric.BodyMetricRecordRepository;
import com.diet.domain.metric.BodyMetricType;
import com.diet.domain.user.Gender;
import com.diet.domain.user.GoalCalorieStrategy;
import com.diet.domain.user.GoalMode;
import com.diet.api.user.GoalPlanPreviewResponse;
import com.diet.api.user.GoalWarningMessage;
import com.diet.api.user.GoalWarningLevel;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class GoalPlanningService {

    private static final BigDecimal DAILY_CONSUMPTION_BASE_RATIO = new BigDecimal("0.70");

    private static final BigDecimal CALORIES_PER_KG = new BigDecimal("7700");

    private static final BigDecimal MAINTAIN_WEIGHT_GAP = new BigDecimal("0.30");

    private static final BigDecimal MAX_TREND_ADJUSTMENT = new BigDecimal("150");

    private static final BigDecimal MIN_SMART_DAYS = new BigDecimal("7");

    private final BodyMetricRecordRepository bodyMetricRecordRepository;

    public GoalPlanningService(BodyMetricRecordRepository bodyMetricRecordRepository) {
        this.bodyMetricRecordRepository = bodyMetricRecordRepository;
    }

    public GoalPlanPreviewResponse preview(GoalPlanningProfile profile) {
        GoalCalorieStrategy strategy = profile.goalCalorieStrategy() == null
                ? GoalCalorieStrategy.MANUAL
                : profile.goalCalorieStrategy();
        BigDecimal effectiveCurrentWeight = resolveEffectiveCurrentWeight(profile.userId(), profile.currentWeight(), LocalDate.now());
        BigDecimal effectiveBmr = calculateEffectiveBmr(
                profile.gender(),
                profile.birthDate(),
                profile.height(),
                effectiveCurrentWeight,
                profile.customBmr()
        );
        Integer effectiveTdee = calculateEffectiveTdee(
                profile.gender(),
                profile.birthDate(),
                profile.height(),
                effectiveCurrentWeight,
                profile.customBmr(),
                profile.customTdee()
        );

        return strategy == GoalCalorieStrategy.SMART
                ? buildSmartPlan(profile, effectiveCurrentWeight, effectiveBmr, effectiveTdee)
                : buildManualPlan(profile, effectiveBmr, effectiveTdee);
    }

    private GoalPlanPreviewResponse buildSmartPlan(
            GoalPlanningProfile profile,
            BigDecimal effectiveCurrentWeight,
            BigDecimal effectiveBmr,
            Integer effectiveTdee
    ) {
        if (effectiveCurrentWeight == null || profile.targetWeight() == null) {
            throw new IllegalArgumentException("智能推荐前请先设置当前体重和目标体重");
        }
        if (effectiveTdee == null) {
            throw new IllegalArgumentException("智能推荐前请先完善基础代谢或基础日消耗");
        }

        BigDecimal targetGap = profile.targetWeight().subtract(effectiveCurrentWeight);
        if (targetGap.abs().compareTo(MAINTAIN_WEIGHT_GAP) <= 0) {
            return buildPreviewResponse(
                    effectiveTdee,
                    0,
                    GoalMode.MAINTAIN,
                    BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                    effectiveBmr,
                    GoalCalorieStrategy.SMART,
                    false
            );
        }

        LocalDate goalTargetDate = profile.goalTargetDate();
        if (goalTargetDate == null) {
            throw new IllegalArgumentException("请设置预期达成日期");
        }
        long remainingDays = ChronoUnit.DAYS.between(LocalDate.now(), goalTargetDate);
        if (remainingDays < MIN_SMART_DAYS.intValue()) {
            throw new IllegalArgumentException("预期达成日期至少需要晚于今天 7 天");
        }

        BigDecimal rawDelta = targetGap.multiply(CALORIES_PER_KG)
                .divide(BigDecimal.valueOf(remainingDays), 2, RoundingMode.HALF_UP);
        BigDecimal plannedWeeklyChangeKg = targetGap.multiply(BigDecimal.valueOf(7))
                .divide(BigDecimal.valueOf(remainingDays), 2, RoundingMode.HALF_UP);

        TrendAdjustment adjustment = resolveTrendAdjustment(profile.userId(), plannedWeeklyChangeKg);
        int goalCalorieDelta = rawDelta.add(adjustment.adjustmentKcal()).setScale(0, RoundingMode.HALF_UP).intValue();
        GoalMode goalMode = goalCalorieDelta < 0 ? GoalMode.LOSE : GoalMode.GAIN;

        return buildPreviewResponse(
                effectiveTdee + goalCalorieDelta,
                goalCalorieDelta,
                goalMode,
                plannedWeeklyChangeKg,
                effectiveBmr,
                GoalCalorieStrategy.SMART,
                adjustment.usedTrendAdjustment()
        );
    }

    private GoalPlanPreviewResponse buildManualPlan(
            GoalPlanningProfile profile,
            BigDecimal effectiveBmr,
            Integer effectiveTdee
    ) {
        Integer resolvedTargetCalories = profile.dailyCalorieTarget();
        Integer resolvedGoalDelta = profile.goalCalorieDelta();
        GoalMode resolvedGoalMode = profile.goalMode();

        if (resolvedTargetCalories == null && resolvedGoalDelta == null && resolvedGoalMode == null) {
            resolvedGoalDelta = profile.currentGoalCalorieDelta();
            resolvedGoalMode = profile.currentGoalMode();
            if (resolvedGoalDelta == null && resolvedGoalMode == null) {
                resolvedTargetCalories = profile.currentDailyCalorieTarget();
            }
        }

        if (resolvedGoalDelta == null && resolvedTargetCalories != null) {
            if (effectiveTdee == null) {
                throw new IllegalArgumentException("设置目标热量前请先完善基础代谢或基础日消耗");
            }
            resolvedGoalDelta = resolvedTargetCalories - effectiveTdee;
        }
        if (resolvedGoalDelta == null && resolvedGoalMode != null) {
            resolvedGoalDelta = resolvedGoalMode.getDefaultDelta();
        }
        if (resolvedGoalDelta == null) {
            resolvedGoalDelta = 0;
        }
        if (resolvedGoalMode == null) {
            resolvedGoalMode = inferGoalModeFromDelta(resolvedGoalDelta);
        }
        if (resolvedTargetCalories == null) {
            resolvedTargetCalories = effectiveTdee == null ? null : effectiveTdee + resolvedGoalDelta;
        }

        BigDecimal plannedWeeklyChangeKg = BigDecimal.valueOf(resolvedGoalDelta)
                .multiply(BigDecimal.valueOf(7))
                .divide(CALORIES_PER_KG, 2, RoundingMode.HALF_UP);

        return buildPreviewResponse(
                resolvedTargetCalories,
                resolvedGoalDelta,
                resolvedGoalMode,
                plannedWeeklyChangeKg,
                effectiveBmr,
                GoalCalorieStrategy.MANUAL,
                false
        );
    }

    private GoalPlanPreviewResponse buildPreviewResponse(
            Integer targetCalories,
            Integer goalCalorieDelta,
            GoalMode goalMode,
            BigDecimal plannedWeeklyChangeKg,
            BigDecimal effectiveBmr,
            GoalCalorieStrategy goalCalorieStrategy,
            boolean usedTrendAdjustment
    ) {
        GoalWarning warning = evaluateWarning(
                targetCalories,
                goalCalorieDelta,
                plannedWeeklyChangeKg,
                effectiveBmr,
                goalCalorieStrategy
        );
        return new GoalPlanPreviewResponse(
                targetCalories,
                goalCalorieDelta,
                goalMode,
                plannedWeeklyChangeKg,
                warning.level(),
                warning.message(),
                usedTrendAdjustment
        );
    }

    private GoalWarning evaluateWarning(
            Integer targetCalories,
            Integer goalCalorieDelta,
            BigDecimal plannedWeeklyChangeKg,
            BigDecimal effectiveBmr,
            GoalCalorieStrategy goalCalorieStrategy
    ) {
        if (goalCalorieDelta == null) {
            return new GoalWarning(GoalWarningLevel.NONE, "");
        }

        GoalCalorieStrategy strategy = goalCalorieStrategy == null ? GoalCalorieStrategy.MANUAL : goalCalorieStrategy;
        if (strategy == GoalCalorieStrategy.MANUAL) {
            return evaluateManualWarning(targetCalories, goalCalorieDelta, plannedWeeklyChangeKg, effectiveBmr);
        }
        return evaluateSmartWarning(targetCalories, goalCalorieDelta, plannedWeeklyChangeKg, effectiveBmr);
    }

    private GoalWarning evaluateManualWarning(
            Integer targetCalories,
            Integer goalCalorieDelta,
            BigDecimal plannedWeeklyChangeKg,
            BigDecimal effectiveBmr
    ) {
        if (effectiveBmr != null
                && targetCalories != null
                && BigDecimal.valueOf(targetCalories).compareTo(effectiveBmr.setScale(0, RoundingMode.HALF_UP)) < 0) {
            return new GoalWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.MANUAL_BELOW_BMR.text());
        }
        if (plannedWeeklyChangeKg != null && plannedWeeklyChangeKg.compareTo(new BigDecimal("-1.00")) < 0) {
            return new GoalWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.MANUAL_WEEKLY_LOSS_TOO_FAST.text());
        }
        if (plannedWeeklyChangeKg != null && plannedWeeklyChangeKg.compareTo(new BigDecimal("0.50")) > 0) {
            return new GoalWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.MANUAL_WEEKLY_GAIN_TOO_FAST.text());
        }
        if (goalCalorieDelta <= -900) {
            return new GoalWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.MANUAL_DAILY_DEFICIT_TOO_LARGE.text());
        }
        if (goalCalorieDelta >= 500) {
            return new GoalWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.MANUAL_DAILY_SURPLUS_TOO_LARGE.text());
        }
        return new GoalWarning(GoalWarningLevel.NONE, "");
    }

    private GoalWarning evaluateSmartWarning(
            Integer targetCalories,
            Integer goalCalorieDelta,
            BigDecimal plannedWeeklyChangeKg,
            BigDecimal effectiveBmr
    ) {
        if (effectiveBmr != null
                && targetCalories != null
                && BigDecimal.valueOf(targetCalories).compareTo(effectiveBmr.setScale(0, RoundingMode.HALF_UP)) < 0) {
            return new GoalWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.SMART_BELOW_BMR.text());
        }
        if (plannedWeeklyChangeKg != null && plannedWeeklyChangeKg.compareTo(new BigDecimal("-1.00")) < 0) {
            return new GoalWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.SMART_WEEKLY_LOSS_TOO_FAST.text());
        }
        if (plannedWeeklyChangeKg != null && plannedWeeklyChangeKg.compareTo(new BigDecimal("0.50")) > 0) {
            return new GoalWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.SMART_WEEKLY_GAIN_TOO_FAST.text());
        }
        if (goalCalorieDelta <= -900) {
            return new GoalWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.SMART_DAILY_DEFICIT_TOO_LARGE.text());
        }
        if (goalCalorieDelta >= 500) {
            return new GoalWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.SMART_DAILY_SURPLUS_TOO_LARGE.text());
        }
        return new GoalWarning(GoalWarningLevel.NONE, "");
    }

    private TrendAdjustment resolveTrendAdjustment(Long userId, BigDecimal plannedWeeklyChangeKg) {
        if (userId == null) {
            return new TrendAdjustment(BigDecimal.ZERO, false);
        }
        LocalDate endDate = LocalDate.now();
        List<BodyMetricRecord> records = bodyMetricRecordRepository.findDailyLatestByMetricTypeAndDateRange(
                userId,
                BodyMetricType.WEIGHT,
                endDate.minusDays(13),
                endDate
        );
        if (records.size() < 2) {
            return new TrendAdjustment(BigDecimal.ZERO, false);
        }

        BodyMetricRecord first = records.get(0);
        BodyMetricRecord last = records.get(records.size() - 1);
        long daysBetween = ChronoUnit.DAYS.between(first.getRecordDate(), last.getRecordDate());
        if (daysBetween < 7) {
            return new TrendAdjustment(BigDecimal.ZERO, false);
        }

        BigDecimal actualWeeklyChangeKg = last.getMetricValue().subtract(first.getMetricValue())
                .multiply(BigDecimal.valueOf(7))
                .divide(BigDecimal.valueOf(daysBetween), 2, RoundingMode.HALF_UP);
        BigDecimal adjustment = plannedWeeklyChangeKg.subtract(actualWeeklyChangeKg)
                .multiply(CALORIES_PER_KG)
                .divide(BigDecimal.valueOf(7), 2, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("0.5"));

        if (adjustment.compareTo(MAX_TREND_ADJUSTMENT) > 0) {
            adjustment = MAX_TREND_ADJUSTMENT;
        }
        if (adjustment.compareTo(MAX_TREND_ADJUSTMENT.negate()) < 0) {
            adjustment = MAX_TREND_ADJUSTMENT.negate();
        }
        if (adjustment.abs().compareTo(BigDecimal.ONE) < 0) {
            return new TrendAdjustment(BigDecimal.ZERO, false);
        }
        return new TrendAdjustment(adjustment, true);
    }

    private BigDecimal resolveEffectiveCurrentWeight(Long userId, BigDecimal currentWeight, LocalDate today) {
        if (userId == null) {
            return currentWeight;
        }
        BodyMetricRecord latestRecord = bodyMetricRecordRepository.findLatestByMetricType(userId, BodyMetricType.WEIGHT)
                .orElse(null);
        if (latestRecord == null) {
            return currentWeight;
        }
        if (latestRecord.getRecordDate() != null && !latestRecord.getRecordDate().isBefore(today.minusDays(7))) {
            return latestRecord.getMetricValue();
        }
        return currentWeight;
    }

    private BigDecimal calculateEffectiveBmr(
            Gender gender,
            LocalDate birthDate,
            BigDecimal height,
            BigDecimal currentWeight,
            Integer customBmr
    ) {
        if (customBmr != null && customBmr > 0) {
            return BigDecimal.valueOf(customBmr).setScale(2, RoundingMode.HALF_UP);
        }
        if (gender == null || birthDate == null || height == null || currentWeight == null) {
            return null;
        }
        int age = Period.between(birthDate, LocalDate.now()).getYears();
        if (age < 0) {
            return null;
        }
        BigDecimal base = currentWeight.multiply(BigDecimal.TEN)
                .add(height.multiply(BigDecimal.valueOf(6.25)))
                .subtract(BigDecimal.valueOf(age).multiply(BigDecimal.valueOf(5)));
        BigDecimal offset = gender == Gender.MALE ? BigDecimal.valueOf(5) : BigDecimal.valueOf(-161);
        return base.add(offset).setScale(2, RoundingMode.HALF_UP);
    }

    private Integer calculateEffectiveTdee(
            Gender gender,
            LocalDate birthDate,
            BigDecimal height,
            BigDecimal currentWeight,
            Integer customBmr,
            Integer customTdee
    ) {
        if (customTdee != null && customTdee > 0) {
            return customTdee;
        }
        BigDecimal bmr = calculateEffectiveBmr(gender, birthDate, height, currentWeight, customBmr);
        if (bmr == null) {
            return null;
        }
        return bmr.divide(DAILY_CONSUMPTION_BASE_RATIO, 2, RoundingMode.HALF_UP)
                .setScale(0, RoundingMode.HALF_UP)
                .intValue();
    }

    private GoalMode inferGoalModeFromDelta(Integer goalCalorieDelta) {
        if (goalCalorieDelta == null || goalCalorieDelta == 0) {
            return GoalMode.MAINTAIN;
        }
        return goalCalorieDelta > 0 ? GoalMode.GAIN : GoalMode.LOSE;
    }

    private record TrendAdjustment(BigDecimal adjustmentKcal, boolean usedTrendAdjustment) {
    }

    private record GoalWarning(GoalWarningLevel level, String message) {
    }

    public record GoalPlanningProfile(
            Long userId,
            Gender gender,
            LocalDate birthDate,
            BigDecimal height,
            BigDecimal currentWeight,
            BigDecimal targetWeight,
            Integer customBmr,
            Integer customTdee,
            Integer dailyCalorieTarget,
            GoalMode goalMode,
            Integer goalCalorieDelta,
            Integer currentDailyCalorieTarget,
            GoalMode currentGoalMode,
            Integer currentGoalCalorieDelta,
            LocalDate goalTargetDate,
            GoalCalorieStrategy goalCalorieStrategy
    ) {
    }
}
