package com.diet.api.user;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Schema(description = "用户每日记录汇总")
public record DailySummaryResponse(
        @Schema(description = "用户 ID")
        Long userId,

        @Schema(description = "汇总日期")
        LocalDate date,

        @Schema(description = "目标热量，单位 kcal")
        Integer targetCalories,

        @Schema(description = "饮食摄入热量，单位 kcal")
        BigDecimal dietCalories,

        @Schema(description = "运动消耗热量，单位 kcal")
        BigDecimal exerciseCalories,

        @Schema(description = "净摄入热量（饮食-运动），单位 kcal")
        BigDecimal netCalories,

        @Schema(description = "兼容字段：当前等于净摄入热量，单位 kcal")
        BigDecimal consumedCalories,

        @Schema(description = "剩余热量，单位 kcal")
        BigDecimal remainingCalories,

        @Schema(description = "是否超出目标热量")
        boolean exceededTarget,

        @Schema(description = "蛋白质摄入量，单位 g")
        BigDecimal proteinIntake,

        @Schema(description = "碳水摄入量，单位 g")
        BigDecimal carbsIntake,

        @Schema(description = "脂肪摄入量，单位 g")
        BigDecimal fatIntake,

        @Schema(description = "当日记录流（饮食+运动）")
        List<DailyRecordResponse> records,

        @Schema(description = "餐次进度")
        List<MealProgressResponse> mealProgress,

        @Schema(description = "每日反馈")
        DailyInsightResponse dailyInsight,

        @Schema(description = "阶段趋势反馈")
        TrendInsightResponse trendInsight
) {
}
