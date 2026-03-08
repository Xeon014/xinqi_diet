package com.diet.dto.food;

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
        String source,
        String sourceRef,
        String aliases,
        Boolean isBuiltin,
        LocalDateTime createdAt
) {
}
