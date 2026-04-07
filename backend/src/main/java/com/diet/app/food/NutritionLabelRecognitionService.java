package com.diet.app.food;

import com.diet.api.food.NutritionLabelOcrPort;
import com.diet.api.food.NutritionLabelOcrRequest;
import com.diet.api.food.NutritionLabelRecognitionResponse;
import com.diet.api.food.RecognizeNutritionLabelRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class NutritionLabelRecognitionService {

    private final NutritionLabelOcrPort nutritionLabelOcrPort;

    private final NutritionLabelParser nutritionLabelParser;

    public NutritionLabelRecognitionService(
            NutritionLabelOcrPort nutritionLabelOcrPort,
            NutritionLabelParser nutritionLabelParser
    ) {
        this.nutritionLabelOcrPort = nutritionLabelOcrPort;
        this.nutritionLabelParser = nutritionLabelParser;
    }

    public NutritionLabelRecognitionResponse recognize(RecognizeNutritionLabelRequest request) {
        String imageUrl = normalize(request.imageUrl());
        String imageBase64 = normalizeBase64(request.imageBase64());
        validateInput(imageUrl, imageBase64);

        return nutritionLabelParser.parse(nutritionLabelOcrPort.recognize(new NutritionLabelOcrRequest(imageUrl, imageBase64)));
    }

    private void validateInput(String imageUrl, String imageBase64) {
        boolean hasImageUrl = imageUrl != null;
        boolean hasImageBase64 = imageBase64 != null;
        if (hasImageUrl == hasImageBase64) {
            throw new IllegalArgumentException("imageUrl 与 imageBase64 必须且只能传一个");
        }
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeBase64(String value) {
        String normalized = normalize(value);
        if (normalized == null) {
            return null;
        }
        int commaIndex = normalized.indexOf(',');
        if (normalized.startsWith("data:") && commaIndex > 0 && commaIndex < normalized.length() - 1) {
            return normalized.substring(commaIndex + 1).trim();
        }
        return normalized;
    }
}
