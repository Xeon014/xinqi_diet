package com.diet.dto.food;

import com.diet.domain.food.FoodCalorieUnit;
import com.diet.domain.food.FoodQuantityUnit;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record UpdateFoodRequest(
        @NotBlank(message = "name must not be blank")
        String name,
        @NotNull(message = "caloriesPer100g must not be null")
        @DecimalMin(value = "0.0", inclusive = false, message = "caloriesPer100g must be greater than 0")
        BigDecimal caloriesPer100g,
        @NotNull(message = "proteinPer100g must not be null")
        @DecimalMin(value = "0.0", message = "proteinPer100g must not be negative")
        BigDecimal proteinPer100g,
        @NotNull(message = "carbsPer100g must not be null")
        @DecimalMin(value = "0.0", message = "carbsPer100g must not be negative")
        BigDecimal carbsPer100g,
        @NotNull(message = "fatPer100g must not be null")
        @DecimalMin(value = "0.0", message = "fatPer100g must not be negative")
        BigDecimal fatPer100g,
        String category,
        FoodCalorieUnit calorieUnit,
        FoodQuantityUnit quantityUnit
) {
}
