package com.diet.app.user;

import com.diet.api.user.GoalWarningLevel;
import com.diet.api.user.GoalWarningMessage;
import com.diet.domain.user.GoalCalorieStrategy;
import java.math.BigDecimal;
import java.math.RoundingMode;

final class GoalPlanWarningEvaluator {

    private GoalPlanWarningEvaluator() {
    }

    static GoalPlanWarning evaluate(
            Integer targetCalories,
            Integer goalCalorieDelta,
            BigDecimal plannedWeeklyChangeKg,
            BigDecimal effectiveBmr,
            GoalCalorieStrategy goalCalorieStrategy
    ) {
        if (goalCalorieDelta == null) {
            return new GoalPlanWarning(GoalWarningLevel.NONE, "");
        }

        GoalCalorieStrategy strategy = goalCalorieStrategy == null ? GoalCalorieStrategy.MANUAL : goalCalorieStrategy;
        if (strategy == GoalCalorieStrategy.MANUAL) {
            return evaluateManualWarning(targetCalories, goalCalorieDelta, plannedWeeklyChangeKg, effectiveBmr);
        }
        return evaluateSmartWarning(targetCalories, goalCalorieDelta, plannedWeeklyChangeKg, effectiveBmr);
    }

    private static GoalPlanWarning evaluateManualWarning(
            Integer targetCalories,
            Integer goalCalorieDelta,
            BigDecimal plannedWeeklyChangeKg,
            BigDecimal effectiveBmr
    ) {
        if (isBelowBmr(targetCalories, effectiveBmr)) {
            return new GoalPlanWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.MANUAL_BELOW_BMR.text());
        }
        if (plannedWeeklyChangeKg != null && plannedWeeklyChangeKg.compareTo(new BigDecimal("-1.00")) < 0) {
            return new GoalPlanWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.MANUAL_WEEKLY_LOSS_TOO_FAST.text());
        }
        if (plannedWeeklyChangeKg != null && plannedWeeklyChangeKg.compareTo(new BigDecimal("0.50")) > 0) {
            return new GoalPlanWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.MANUAL_WEEKLY_GAIN_TOO_FAST.text());
        }
        if (goalCalorieDelta <= -900) {
            return new GoalPlanWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.MANUAL_DAILY_DEFICIT_TOO_LARGE.text());
        }
        if (goalCalorieDelta >= 500) {
            return new GoalPlanWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.MANUAL_DAILY_SURPLUS_TOO_LARGE.text());
        }
        return new GoalPlanWarning(GoalWarningLevel.NONE, "");
    }

    private static GoalPlanWarning evaluateSmartWarning(
            Integer targetCalories,
            Integer goalCalorieDelta,
            BigDecimal plannedWeeklyChangeKg,
            BigDecimal effectiveBmr
    ) {
        if (isBelowBmr(targetCalories, effectiveBmr)) {
            return new GoalPlanWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.SMART_BELOW_BMR.text());
        }
        if (plannedWeeklyChangeKg != null && plannedWeeklyChangeKg.compareTo(new BigDecimal("-1.00")) < 0) {
            return new GoalPlanWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.SMART_WEEKLY_LOSS_TOO_FAST.text());
        }
        if (plannedWeeklyChangeKg != null && plannedWeeklyChangeKg.compareTo(new BigDecimal("0.50")) > 0) {
            return new GoalPlanWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.SMART_WEEKLY_GAIN_TOO_FAST.text());
        }
        if (goalCalorieDelta <= -900) {
            return new GoalPlanWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.SMART_DAILY_DEFICIT_TOO_LARGE.text());
        }
        if (goalCalorieDelta >= 500) {
            return new GoalPlanWarning(GoalWarningLevel.EXTREME, GoalWarningMessage.SMART_DAILY_SURPLUS_TOO_LARGE.text());
        }
        return new GoalPlanWarning(GoalWarningLevel.NONE, "");
    }

    private static boolean isBelowBmr(Integer targetCalories, BigDecimal effectiveBmr) {
        return effectiveBmr != null
                && targetCalories != null
                && BigDecimal.valueOf(targetCalories).compareTo(effectiveBmr.setScale(0, RoundingMode.HALF_UP)) < 0;
    }

    record GoalPlanWarning(GoalWarningLevel level, String message) {
    }
}
