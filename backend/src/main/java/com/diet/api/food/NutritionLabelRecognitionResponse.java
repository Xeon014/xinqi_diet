package com.diet.api.food;

import com.diet.domain.food.FoodQuantityUnit;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.List;

@Schema(description = "营养成分表识别结果")
public record NutritionLabelRecognitionResponse(
        @Schema(description = "识别到的食品名称，可为空")
        String foodName,
        @Schema(description = "归一化后的每 100 单位热量，单位 kcal")
        BigDecimal normalizedCaloriesPer100,
        @Schema(description = "归一化后的每 100 单位蛋白质，单位 g")
        BigDecimal normalizedProteinPer100,
        @Schema(description = "归一化后的每 100 单位碳水，单位 g")
        BigDecimal normalizedCarbsPer100,
        @Schema(description = "归一化后的每 100 单位脂肪，单位 g")
        BigDecimal normalizedFatPer100,
        @Schema(description = "归一化后的数量单位，G 表示每 100g，ML 表示每 100ml，可为空")
        FoodQuantityUnit quantityUnit,
        @Schema(description = "识别到的营养表基准类型")
        NutritionLabelBaseType baseType,
        @Schema(description = "识别到的原始基准文案")
        String recognizedBaseText,
        @Schema(description = "每份对应数值，仅在识别到每份口径时返回")
        BigDecimal servingAmount,
        @Schema(description = "每份对应单位，仅在识别到每份且可识别单位时返回")
        FoodQuantityUnit servingUnit,
        @Schema(description = "综合置信度")
        NutritionLabelConfidenceLevel confidenceLevel,
        @Schema(description = "缺失字段列表")
        List<String> missingFields,
        @Schema(description = "本次实际使用的 OCR 引擎列表")
        List<String> enginesUsed,
        @Schema(description = "原始识别文本行，便于前端回显与人工校对")
        List<String> rawTextLines
) {
}
