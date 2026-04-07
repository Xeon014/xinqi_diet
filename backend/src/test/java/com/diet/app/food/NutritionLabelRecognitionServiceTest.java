package com.diet.app.food;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.diet.api.food.NutritionLabelOcrPort;
import com.diet.api.food.NutritionLabelOcrRequest;
import com.diet.api.food.NutritionLabelOcrResult;
import com.diet.api.food.RecognizeNutritionLabelRequest;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NutritionLabelRecognitionServiceTest {

    @Mock
    private NutritionLabelOcrPort nutritionLabelOcrPort;

    private NutritionLabelRecognitionService nutritionLabelRecognitionService;

    @BeforeEach
    void setUp() {
        nutritionLabelRecognitionService = new NutritionLabelRecognitionService(
                nutritionLabelOcrPort,
                new NutritionLabelParser()
        );
    }

    @Test
    void shouldRejectWhenImageUrlAndImageBase64AreBothMissing() {
        assertThatThrownBy(() -> nutritionLabelRecognitionService.recognize(new RecognizeNutritionLabelRequest(null, null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("imageUrl 与 imageBase64 必须且只能传一个");
    }

    @Test
    void shouldRejectWhenImageUrlAndImageBase64AreBothProvided() {
        assertThatThrownBy(() -> nutritionLabelRecognitionService.recognize(new RecognizeNutritionLabelRequest(
                "https://example.com/a.jpg",
                "abc"
        )))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("imageUrl 与 imageBase64 必须且只能传一个");
    }

    @Test
    void shouldStripDataUriPrefixBeforeCallingOcr() {
        when(nutritionLabelOcrPort.recognize(new NutritionLabelOcrRequest(null, "dGVzdA==")))
                .thenReturn(new NutritionLabelOcrResult(
                        List.of(
                                List.of("食品名称", "燕麦奶"),
                                List.of("营养成分表", "每100毫升"),
                                List.of("能量", "180kJ"),
                                List.of("蛋白质", "1.0g"),
                                List.of("脂肪", "3.0g"),
                                List.of("碳水化合物", "6.0g")
                        ),
                        List.of(),
                        List.of("MOCK")
                ));

        var response = nutritionLabelRecognitionService.recognize(new RecognizeNutritionLabelRequest(
                null,
                "data:image/jpeg;base64,dGVzdA=="
        ));

        assertThat(response.foodName()).isEqualTo("燕麦奶");
        assertThat(response.normalizedCaloriesPer100()).isEqualByComparingTo("43.02");
    }
}
