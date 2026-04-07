package com.diet.api.food;

public record NutritionLabelOcrRequest(
        String imageUrl,
        String imageBase64
) {
}
