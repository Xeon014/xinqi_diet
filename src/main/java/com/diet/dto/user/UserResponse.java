package com.diet.dto.user;

import com.diet.domain.user.ActivityLevel;
import com.diet.domain.user.Gender;
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

        @Schema(description = "活动量等级")
        ActivityLevel activityLevel,

        @Schema(description = "每日目标热量，单位 kcal")
        Integer dailyCalorieTarget,

        @Schema(description = "当前体重，单位 kg")
        BigDecimal currentWeight,

        @Schema(description = "目标体重，单位 kg")
        BigDecimal targetWeight,

        @Schema(description = "用户自定义基础代谢 BMR，单位 kcal，可为空")
        Integer customBmr,

        @Schema(description = "BMI 指数")
        BigDecimal bmi,

        @Schema(description = "基础代谢 BMR")
        BigDecimal bmr,

        @Schema(description = "每日总能量消耗 TDEE")
        BigDecimal tdee,

        @Schema(description = "创建时间")
        LocalDateTime createdAt
) {
}