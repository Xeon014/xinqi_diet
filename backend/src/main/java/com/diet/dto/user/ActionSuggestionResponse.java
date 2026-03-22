package com.diet.dto.user;

import com.diet.domain.record.MealType;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "行动建议")
public record ActionSuggestionResponse(
        @Schema(description = "建议类型")
        String type,

        @Schema(description = "建议标题")
        String title,

        @Schema(description = "建议说明")
        String description,

        @Schema(description = "关联餐次")
        MealType mealType
) {
}
