package com.diet.user.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ProgressPointResponse(
        LocalDate date,
        BigDecimal consumedCalories,
        Integer targetCalories,
        BigDecimal calorieGap
) {
}
