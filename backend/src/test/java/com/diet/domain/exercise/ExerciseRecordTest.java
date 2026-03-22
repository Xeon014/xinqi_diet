package com.diet.domain.exercise;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class ExerciseRecordTest {

    @Test
    void shouldCalculateCaloriesWithDifferentIntensity() {
        BigDecimal met = new BigDecimal("8.0");
        BigDecimal weight = new BigDecimal("60");
        Integer durationMinutes = 30;

        BigDecimal low = ExerciseRecord.calculateTotalCalories(met, weight, durationMinutes, ExerciseIntensity.LOW.factor());
        BigDecimal medium = ExerciseRecord.calculateTotalCalories(met, weight, durationMinutes, ExerciseIntensity.MEDIUM.factor());
        BigDecimal high = ExerciseRecord.calculateTotalCalories(met, weight, durationMinutes, ExerciseIntensity.HIGH.factor());

        assertThat(low).isEqualByComparingTo(new BigDecimal("192.00"));
        assertThat(medium).isEqualByComparingTo(new BigDecimal("240.00"));
        assertThat(high).isEqualByComparingTo(new BigDecimal("288.00"));
    }

    @Test
    void shouldSupportShortDurationCalculation() {
        BigDecimal calories = ExerciseRecord.calculateTotalCalories(
                new BigDecimal("7.5"),
                new BigDecimal("55"),
                1,
                ExerciseIntensity.MEDIUM.factor()
        );

        assertThat(calories).isEqualByComparingTo(new BigDecimal("6.88"));
    }
}