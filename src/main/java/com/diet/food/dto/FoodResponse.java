package com.diet.food.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record FoodResponse(
        Long id,
        String name,
        BigDecimal caloriesPer100g,
        BigDecimal proteinPer100g,
        BigDecimal carbsPer100g,
        BigDecimal fatPer100g,
        String category,
        LocalDateTime createdAt
) {
}
