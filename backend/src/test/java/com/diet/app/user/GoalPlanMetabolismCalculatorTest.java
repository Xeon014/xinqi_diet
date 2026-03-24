package com.diet.app.user;

import static org.assertj.core.api.Assertions.assertThat;

import com.diet.domain.user.Gender;
import com.diet.domain.user.GoalMode;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class GoalPlanMetabolismCalculatorTest {

    @Test
    void shouldUseCustomValuesWhenProvided() {
        assertThat(GoalPlanMetabolismCalculator.calculateEffectiveBmr(
                Gender.FEMALE,
                LocalDate.of(2000, 1, 1),
                new BigDecimal("165.00"),
                new BigDecimal("60.00"),
                1400
        )).isEqualByComparingTo("1400.00");

        assertThat(GoalPlanMetabolismCalculator.calculateEffectiveTdee(
                Gender.FEMALE,
                LocalDate.of(2000, 1, 1),
                new BigDecimal("165.00"),
                new BigDecimal("60.00"),
                null,
                2000
        )).isEqualTo(2000);
    }

    @Test
    void shouldCalculateGoalDirectionAndWeeklyChange() {
        assertThat(GoalPlanMetabolismCalculator.inferGoalModeFromDelta(-300)).isEqualTo(GoalMode.LOSE);
        assertThat(GoalPlanMetabolismCalculator.inferGoalModeFromDelta(300)).isEqualTo(GoalMode.GAIN);
        assertThat(GoalPlanMetabolismCalculator.inferGoalModeFromDelta(0)).isEqualTo(GoalMode.MAINTAIN);
        assertThat(GoalPlanMetabolismCalculator.calculatePlannedWeeklyChangeKg(-440))
                .isEqualByComparingTo("-0.40");
    }
}
