package com.diet.dto.user;

import com.diet.domain.record.MealType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "每日反馈")
public record DailyInsightResponse(
        @Schema(description = "每日总结")
        String summaryText,

        @Schema(description = "主要问题餐次")
        MealType topIssueMealType,

        @Schema(description = "记录完成度，范围 0-1")
        double recordCompleteness,

        @Schema(description = "行动建议")
        List<ActionSuggestionResponse> suggestions
) {
}
