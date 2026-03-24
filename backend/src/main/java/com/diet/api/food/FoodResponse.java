package com.diet.api.food;

import com.diet.domain.food.FoodCalorieUnit;
import com.diet.domain.food.FoodQuantityUnit;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record FoodResponse(
        Long id,
        Long userId,
        String name,
        BigDecimal caloriesPer100g,
        BigDecimal displayCaloriesPer100,
        FoodCalorieUnit calorieUnit,
        BigDecimal proteinPer100g,
        BigDecimal carbsPer100g,
        BigDecimal fatPer100g,
        FoodQuantityUnit quantityUnit,
        String category,
        String source,
        String sourceRef,
        String aliases,
        String imageUrl,
        @JsonProperty("isBuiltin")
        Boolean isBuiltin,
        LocalDateTime createdAt
) {
}
