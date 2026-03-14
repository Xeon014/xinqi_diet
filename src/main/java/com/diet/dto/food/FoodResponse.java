package com.diet.dto.food;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record FoodResponse(
        Long id,
        Long userId,
        String name,
        BigDecimal caloriesPer100g,
        BigDecimal proteinPer100g,
        BigDecimal carbsPer100g,
        BigDecimal fatPer100g,
        String category,
        String source,
        String sourceRef,
        String aliases,
        @JsonProperty("isBuiltin")
        Boolean isBuiltin,
        LocalDateTime createdAt
) {
}
