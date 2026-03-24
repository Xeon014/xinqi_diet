package com.diet.app.user;

import com.diet.app.record.exercise.ExerciseRecordQueryService;
import com.diet.app.record.meal.MealRecordQueryService;
import com.diet.domain.exercise.ExerciseRecord;
import com.diet.domain.record.MealRecord;
import com.diet.domain.record.MealType;
import com.diet.domain.user.UserProfile;
import com.diet.api.user.ProgressPointResponse;
import com.diet.api.user.ProgressSummaryResponse;
import com.diet.api.user.TrendInsightResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ProgressQueryService {

    private static final Map<MealType, BigDecimal> MEAL_TARGET_RATIO = Map.of(
            MealType.BREAKFAST, BigDecimal.valueOf(0.25),
            MealType.MORNING_SNACK, BigDecimal.valueOf(0.10),
            MealType.LUNCH, BigDecimal.valueOf(0.30),
            MealType.AFTERNOON_SNACK, BigDecimal.valueOf(0.10),
            MealType.DINNER, BigDecimal.valueOf(0.20),
            MealType.LATE_NIGHT_SNACK, BigDecimal.valueOf(0.05)
    );

    private static final List<MealType> RECOMMENDED_MEAL_TYPES = List.of(
            MealType.BREAKFAST,
            MealType.MORNING_SNACK,
            MealType.LUNCH,
            MealType.AFTERNOON_SNACK,
            MealType.DINNER,
            MealType.LATE_NIGHT_SNACK
    );

    private final MealRecordQueryService mealRecordQueryService;

    private final ExerciseRecordQueryService exerciseRecordQueryService;

    private final UserProfileSupport userProfileSupport;

    public ProgressQueryService(
            MealRecordQueryService mealRecordQueryService,
            ExerciseRecordQueryService exerciseRecordQueryService,
            UserProfileSupport userProfileSupport
    ) {
        this.mealRecordQueryService = mealRecordQueryService;
        this.exerciseRecordQueryService = exerciseRecordQueryService;
        this.userProfileSupport = userProfileSupport;
    }

    public ProgressSummaryResponse getProgress(Long userId, LocalDate startDate, LocalDate endDate) {
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("endDate must not be before startDate");
        }

        UserProfile user = userProfileSupport.getUser(userId);
        List<MealRecord> mealRecords = mealRecordQueryService.findRecordsByUserAndDateRange(userId, startDate, endDate);
        List<ExerciseRecord> exerciseRecords = exerciseRecordQueryService.findRecordsByUserAndDateRange(userId, startDate, endDate);

        List<ProgressPointResponse> trend = startDate.datesUntil(endDate.plusDays(1))
                .map(date -> buildPoint(user, date, mealRecords, exerciseRecords))
                .toList();

        BigDecimal totalCalories = trend.stream()
                .map(ProgressPointResponse::consumedCalories)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal averageCalories = trend.isEmpty()
                ? BigDecimal.ZERO
                : totalCalories.divide(BigDecimal.valueOf(trend.size()), 2, RoundingMode.HALF_UP);

        List<BigDecimal> gaps = trend.stream()
                .map(ProgressPointResponse::calorieGap)
                .filter(java.util.Objects::nonNull)
                .toList();

        BigDecimal totalGap = gaps.isEmpty()
                ? null
                : gaps.stream().reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

        BigDecimal averageGap = gaps.isEmpty()
                ? null
                : totalGap.divide(BigDecimal.valueOf(gaps.size()), 2, RoundingMode.HALF_UP);

        int exerciseDays = (int) exerciseRecords.stream()
                .map(ExerciseRecord::getRecordDate)
                .distinct()
                .count();

        MealType topExceededMealType = resolveTopIssueMealType(
                userProfileSupport.resolveEffectiveTargetCalories(user),
                mealRecords,
                startDate,
                endDate
        );

        return new ProgressSummaryResponse(
                userId,
                startDate,
                endDate,
                averageCalories,
                totalCalories,
                averageGap,
                user.weightToLose(),
                exerciseDays,
                topExceededMealType,
                trend
        );
    }

    TrendInsightResponse getTrendInsight(UserProfile user, LocalDate date) {
        LocalDate startDate = date.minusDays(6);
        List<MealRecord> mealRecords = mealRecordQueryService.findRecordsByUserAndDateRange(user.getId(), startDate, date);
        List<ExerciseRecord> exerciseRecords = exerciseRecordQueryService.findRecordsByUserAndDateRange(user.getId(), startDate, date);

        List<ProgressPointResponse> points = startDate.datesUntil(date.plusDays(1))
                .map(day -> buildPoint(user, day, mealRecords, exerciseRecords))
                .toList();

        BigDecimal averageNetCalories = points.stream()
                .map(ProgressPointResponse::consumedCalories)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(points.size()), 2, RoundingMode.HALF_UP);

        int exerciseDays = (int) exerciseRecords.stream()
                .map(ExerciseRecord::getRecordDate)
                .distinct()
                .count();

        MealType topExceededMealType = resolveTopIssueMealType(
                userProfileSupport.resolveEffectiveTargetCalories(user),
                mealRecords,
                startDate,
                date
        );

        return new TrendInsightResponse(averageNetCalories, exerciseDays, topExceededMealType);
    }

    MealType resolveTopIssueMealType(
            Integer dailyTargetCalories,
            List<MealRecord> mealRecords,
            LocalDate startDate,
            LocalDate endDate
    ) {
        if (dailyTargetCalories == null) {
            return null;
        }

        EnumMap<MealType, BigDecimal> overflowMap = new EnumMap<>(MealType.class);
        for (MealType mealType : MealType.values()) {
            overflowMap.put(mealType, BigDecimal.ZERO);
        }

        Map<LocalDate, List<MealRecord>> recordsByDate = mealRecords.stream()
                .collect(Collectors.groupingBy(MealRecord::getRecordDate, LinkedHashMap::new, Collectors.toList()));

        startDate.datesUntil(endDate.plusDays(1)).forEach(date -> {
            List<MealRecord> sameDayRecords = recordsByDate.getOrDefault(date, List.of());
            for (MealType mealType : RECOMMENDED_MEAL_TYPES) {
                BigDecimal dayIntake = sameDayRecords.stream()
                        .filter(record -> record.getMealType() == mealType)
                        .map(MealRecord::getTotalCalories)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal dayTarget = BigDecimal.valueOf(dailyTargetCalories)
                        .multiply(MEAL_TARGET_RATIO.get(mealType));

                BigDecimal overflow = dayIntake.subtract(dayTarget);
                if (overflow.compareTo(BigDecimal.ZERO) > 0) {
                    overflowMap.merge(mealType, overflow, BigDecimal::add);
                }
            }
        });

        return overflowMap.entrySet()
                .stream()
                .max(Map.Entry.comparingByValue())
                .filter(entry -> entry.getValue().compareTo(BigDecimal.ZERO) > 0)
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    private ProgressPointResponse buildPoint(
            UserProfile user,
            LocalDate date,
            List<MealRecord> mealRecords,
            List<ExerciseRecord> exerciseRecords
    ) {
        BigDecimal dietCalories = mealRecords.stream()
                .filter(record -> record.getRecordDate().equals(date))
                .map(MealRecord::getTotalCalories)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal exerciseCalories = exerciseRecords.stream()
                .filter(record -> record.getRecordDate().equals(date))
                .map(ExerciseRecord::getTotalCalories)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netCalories = dietCalories.subtract(exerciseCalories).setScale(2, RoundingMode.HALF_UP);
        Integer targetCalories = userProfileSupport.resolveEffectiveTargetCalories(user);
        BigDecimal gap = targetCalories == null
                ? null
                : BigDecimal.valueOf(targetCalories).subtract(netCalories).setScale(2, RoundingMode.HALF_UP);

        return new ProgressPointResponse(date, netCalories, targetCalories, gap);
    }
}
