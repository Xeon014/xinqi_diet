package com.diet.dto.user;

import com.diet.domain.record.MealType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;

@Schema(description = "阶段趋势反馈")
public record TrendInsightResponse(
        @Schema(description = "近7天平均净摄入")
        BigDecimal averageNetCalories,

        @Schema(description = "近7天运动天数")
        int exerciseDays,

        @Schema(description = "近7天最容易超标餐次")
        MealType topExceededMealType
) {
}
