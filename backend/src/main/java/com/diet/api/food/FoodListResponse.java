package com.diet.api.food;

import java.util.List;

public record FoodListResponse(
        List<FoodResponse> foods,
        int page,
        int size,
        long total
) {
}
