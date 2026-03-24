package com.diet.api.user;

import com.diet.domain.record.MealType;
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
        int exerciseDays,
        MealType topExceededMealType,
        List<ProgressPointResponse> trend
) {
}
