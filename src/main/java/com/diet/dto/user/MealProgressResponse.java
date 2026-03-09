package com.diet.dto.user;

import com.diet.domain.record.MealType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;

@Schema(description = "餐次进度")
public record MealProgressResponse(
        @Schema(description = "餐次类型")
        MealType mealType,

        @Schema(description = "餐次名称")
        String mealLabel,

        @Schema(description = "当前餐次摄入热量")
        BigDecimal intakeCalories,

        @Schema(description = "当前餐次目标热量")
        BigDecimal targetCalories,

        @Schema(description = "当前餐次剩余热量")
        BigDecimal remainingCalories,

        @Schema(description = "是否已超出餐次目标")
        boolean exceededTarget,

        @Schema(description = "是否已记录该餐次")
        boolean recorded
) {
}
