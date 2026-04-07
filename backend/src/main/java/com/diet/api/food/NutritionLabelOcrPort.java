package com.diet.api.food;

public interface NutritionLabelOcrPort {

    NutritionLabelOcrResult recognize(NutritionLabelOcrRequest request);
}
