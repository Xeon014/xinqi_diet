package com.diet.dto.user;

import com.diet.dto.record.MealRecordResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Schema(description = "用户每日饮食汇总")
public record DailySummaryResponse(
        @Schema(description = "用户 ID")
        Long userId,

        @Schema(description = "汇总日期")
        LocalDate date,

        @Schema(description = "目标热量，单位 kcal")
        Integer targetCalories,

        @Schema(description = "当日已摄入热量，单位 kcal")
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

        @Schema(description = "当日饮食记录")
        List<MealRecordResponse> records
) {
}