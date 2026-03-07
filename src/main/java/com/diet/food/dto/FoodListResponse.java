package com.diet.food.dto;

import java.util.List;

public record FoodListResponse(
        List<FoodResponse> foods,
        int total
) {
}