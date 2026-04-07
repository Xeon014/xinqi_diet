package com.diet.app.food;

import static org.assertj.core.api.Assertions.assertThat;

import com.diet.api.food.NutritionLabelBaseType;
import com.diet.api.food.NutritionLabelConfidenceLevel;
import com.diet.api.food.NutritionLabelOcrResult;
import com.diet.api.food.NutritionLabelRecognitionResponse;
import com.diet.domain.food.FoodQuantityUnit;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class NutritionLabelParserTest {

    private NutritionLabelParser nutritionLabelParser;

    @BeforeEach
    void setUp() {
        nutritionLabelParser = new NutritionLabelParser();
    }

    @Test
    void shouldParsePer100GramNutritionLabel() {
        NutritionLabelRecognitionResponse response = nutritionLabelParser.parse(new NutritionLabelOcrResult(
                List.of(
                        List.of("食品名称", "无糖酸奶"),
                        List.of("营养成分表", "每100克"),
                        List.of("能量", "274kJ"),
                        List.of("蛋白质", "3.5g"),
                        List.of("脂肪", "2.8g"),
                        List.of("碳水化合物", "6.0g")
                ),
                List.of(),
                List.of("TENCENT_TABLE_ACCURATE_OCR")
        ));

        assertThat(response.foodName()).isEqualTo("无糖酸奶");
        assertThat(response.baseType()).isEqualTo(NutritionLabelBaseType.PER_100_G);
        assertThat(response.quantityUnit()).isEqualTo(FoodQuantityUnit.G);
        assertThat(response.normalizedCaloriesPer100()).isEqualByComparingTo("65.49");
        assertThat(response.normalizedProteinPer100()).isEqualByComparingTo("3.50");
        assertThat(response.normalizedFatPer100()).isEqualByComparingTo("2.80");
        assertThat(response.normalizedCarbsPer100()).isEqualByComparingTo("6.00");
        assertThat(response.confidenceLevel()).isEqualTo(NutritionLabelConfidenceLevel.HIGH);
        assertThat(response.missingFields()).isEmpty();
    }

    @Test
    void shouldConvertPerServingNutritionToPer100() {
        NutritionLabelRecognitionResponse response = nutritionLabelParser.parse(new NutritionLabelOcrResult(
                List.of(
                        List.of("食品名称", "乳酸菌饮料"),
                        List.of("营养成分表", "每份(250ml)"),
                        List.of("能量", "180kJ"),
                        List.of("蛋白质", "1.2g"),
                        List.of("脂肪", "0g"),
                        List.of("碳水化合物", "8.5g")
                ),
                List.of(),
                List.of("TENCENT_TABLE_ACCURATE_OCR")
        ));

        assertThat(response.baseType()).isEqualTo(NutritionLabelBaseType.PER_SERVING);
        assertThat(response.quantityUnit()).isEqualTo(FoodQuantityUnit.ML);
        assertThat(response.servingAmount()).isEqualByComparingTo("250.00");
        assertThat(response.normalizedCaloriesPer100()).isEqualByComparingTo("17.21");
        assertThat(response.normalizedProteinPer100()).isEqualByComparingTo("0.48");
        assertThat(response.normalizedFatPer100()).isEqualByComparingTo("0.00");
        assertThat(response.normalizedCarbsPer100()).isEqualByComparingTo("3.40");
        assertThat(response.confidenceLevel()).isEqualTo(NutritionLabelConfidenceLevel.HIGH);
    }

    @Test
    void shouldReturnLowConfidenceWhenBaseCannotBeNormalized() {
        NutritionLabelRecognitionResponse response = nutritionLabelParser.parse(new NutritionLabelOcrResult(
                List.of(),
                List.of(
                        "营养成分表 每份",
                        "能量 200kJ",
                        "蛋白质 2.0g",
                        "脂肪 3.0g",
                        "碳水化合物 5.0g"
                ),
                List.of("TENCENT_GENERAL_ACCURATE_OCR")
        ));

        assertThat(response.baseType()).isEqualTo(NutritionLabelBaseType.PER_SERVING);
        assertThat(response.quantityUnit()).isNull();
        assertThat(response.normalizedCaloriesPer100()).isNull();
        assertThat(response.normalizedProteinPer100()).isNull();
        assertThat(response.normalizedFatPer100()).isNull();
        assertThat(response.normalizedCarbsPer100()).isNull();
        assertThat(response.confidenceLevel()).isEqualTo(NutritionLabelConfidenceLevel.LOW);
        assertThat(response.missingFields()).contains("foodName", "calories", "protein", "carbs", "fat");
    }
}
