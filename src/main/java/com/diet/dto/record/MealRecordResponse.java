package com.diet.dto.record;

import com.diet.domain.record.MealType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record MealRecordResponse(
        Long id,
        Long userId,
        Long foodId,
        String foodName,
        BigDecimal caloriesPer100g,
        BigDecimal proteinPer100g,
        BigDecimal carbsPer100g,
        BigDecimal fatPer100g,
        MealType mealType,
        BigDecimal quantityInGram,
        BigDecimal totalCalories,
        LocalDate recordDate,
        LocalDateTime createdAt
) {
}
