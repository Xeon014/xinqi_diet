package com.diet.api.food;

import java.util.List;

public record NutritionLabelOcrResult(
        List<List<String>> tableRows,
        List<String> textLines,
        List<String> enginesUsed
) {
}
