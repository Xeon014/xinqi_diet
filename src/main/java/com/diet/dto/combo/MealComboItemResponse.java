package com.diet.dto.combo;

import java.math.BigDecimal;

public record MealComboItemResponse(
        Long foodId,
        String foodName,
        BigDecimal caloriesPer100g,
        BigDecimal proteinPer100g,
        BigDecimal carbsPer100g,
        BigDecimal fatPer100g,
        BigDecimal quantityInGram
) {
}
