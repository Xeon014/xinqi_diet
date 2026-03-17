package com.diet.dto.user;

import com.diet.domain.user.ActivityLevel;
import com.diet.domain.user.Gender;
import com.diet.domain.user.GoalCalorieStrategy;
import com.diet.domain.user.GoalMode;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Schema(description = "用户资料响应")
public record UserResponse(
        @Schema(description = "用户 ID")
        Long id,

        @Schema(description = "用户昵称")
        String name,

        @Schema(description = "性别")
        Gender gender,

        @Schema(description = "生日")
        LocalDate birthDate,

        @Schema(description = "根据生日计算得到的年龄")
        Integer age,

        @Schema(description = "身高，单位 cm")
        BigDecimal height,

        @Schema(description = "活动量等级（兼容保留，不参与热量计算）")
        ActivityLevel activityLevel,

        @Schema(description = "当前目标热量（基础日消耗 + 目标差值），单位 kcal")
        Integer dailyCalorieTarget,

        @Schema(description = "当前体重，单位 kg")
        BigDecimal currentWeight,

        @Schema(description = "目标体重，单位 kg")
        BigDecimal targetWeight,

        @Schema(description = "用户自定义基础代谢 BMR，单位 kcal，可为空")
        Integer customBmr,

        @Schema(description = "用户自定义基础日消耗，单位 kcal，可为空")
        Integer customTdee,

        @Schema(description = "热量目标模式：LOSE/MAINTAIN/GAIN")
        GoalMode goalMode,

        @Schema(description = "目标热量差值，单位 kcal")
        Integer goalCalorieDelta,

        @Schema(description = "预期达到目标体重的日期")
        LocalDate goalTargetDate,

        @Schema(description = "目标热量策略：SMART/MANUAL")
        GoalCalorieStrategy goalCalorieStrategy,

        @Schema(description = "BMI 指数")
        BigDecimal bmi,

        @Schema(description = "基础代谢 BMR")
        BigDecimal bmr,

        @Schema(description = "无运动情况下的基础日消耗")
        BigDecimal tdee,

        @Schema(description = "创建时间")
        LocalDateTime createdAt
) {
}
