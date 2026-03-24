package com.diet.api.combo;

import com.diet.domain.food.FoodQuantityUnit;
import com.diet.domain.food.FoodCalorieUnit;
import java.math.BigDecimal;

public record MealComboItemResponse(
        Long foodId,
        String foodName,
        BigDecimal caloriesPer100g,
        FoodCalorieUnit calorieUnit,
        BigDecimal proteinPer100g,
        BigDecimal carbsPer100g,
        BigDecimal fatPer100g,
        FoodQuantityUnit quantityUnit,
        BigDecimal quantityInGram
) {
}
