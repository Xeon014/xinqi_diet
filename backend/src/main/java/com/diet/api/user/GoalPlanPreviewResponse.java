package com.diet.api.user;

import com.diet.domain.user.GoalMode;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;

@Schema(description = "目标计划预览响应")
public record GoalPlanPreviewResponse(
        @Schema(description = "推荐或当前选择的目标热量，单位 kcal/天")
        Integer recommendedDailyCalorieTarget,

        @Schema(description = "推荐或当前选择的目标热量差值，单位 kcal/天")
        Integer recommendedGoalCalorieDelta,

        @Schema(description = "热量目标模式")
        GoalMode goalMode,

        @Schema(description = "预计每周体重变化，单位 kg，负数表示减重")
        BigDecimal plannedWeeklyChangeKg,

        @Schema(description = "风险等级")
        GoalWarningLevel warningLevel,

        @Schema(description = "风险提示文案")
        String warningMessage,

        @Schema(description = "是否使用了体重趋势微调")
        Boolean usedTrendAdjustment
) {
}
