package com.diet.user.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ProgressSummaryResponse(
        Long userId,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal averageCalories,
        BigDecimal totalCalories,
        BigDecimal averageCalorieGap,
        BigDecimal weightToLose,
        List<ProgressPointResponse> trend
) {
}
