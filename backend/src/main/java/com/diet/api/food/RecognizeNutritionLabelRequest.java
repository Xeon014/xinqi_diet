package com.diet.api.food;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "营养成分表识别请求")
public record RecognizeNutritionLabelRequest(
        @Schema(description = "图片 URL，与 imageBase64 二选一", example = "https://example.com/nutrition-label.jpg")
        String imageUrl,
        @Schema(description = "图片 Base64，与 imageUrl 二选一，支持 data URI 前缀")
        String imageBase64
) {
}
