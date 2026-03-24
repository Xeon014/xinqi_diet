package com.diet.app.user;

import com.diet.domain.user.Gender;
import com.diet.domain.user.GoalMode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;

final class GoalPlanMetabolismCalculator {

    private static final BigDecimal DAILY_CONSUMPTION_BASE_RATIO = new BigDecimal("0.70");

    private static final BigDecimal CALORIES_PER_KG = new BigDecimal("7700");

    private GoalPlanMetabolismCalculator() {
    }

    static BigDecimal calculateEffectiveBmr(
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

    static Integer calculateEffectiveTdee(
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

    static BigDecimal calculatePlannedWeeklyChangeKg(Integer goalCalorieDelta) {
        return BigDecimal.valueOf(goalCalorieDelta)
                .multiply(BigDecimal.valueOf(7))
                .divide(CALORIES_PER_KG, 2, RoundingMode.HALF_UP);
    }

    static GoalMode inferGoalModeFromDelta(Integer goalCalorieDelta) {
        if (goalCalorieDelta == null || goalCalorieDelta == 0) {
            return GoalMode.MAINTAIN;
        }
        return goalCalorieDelta > 0 ? GoalMode.GAIN : GoalMode.LOSE;
    }
}
