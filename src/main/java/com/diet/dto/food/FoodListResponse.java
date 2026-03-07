package com.diet.dto.food;

import java.util.List;

public record FoodListResponse(
        List<FoodResponse> foods,
        int total
) {
}