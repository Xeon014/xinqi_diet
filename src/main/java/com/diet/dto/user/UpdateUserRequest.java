package com.diet.dto.user;

import com.diet.domain.user.ActivityLevel;
import com.diet.domain.user.Gender;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

@Schema(description = "更新用户请求")
public record UpdateUserRequest(
        @Schema(description = "用户昵称，为空时沿用原值")
        @Size(max = 20, message = "name length must be less than or equal to 20")
        String name,

        @Schema(description = "性别")
        @NotNull(message = "gender must not be null")
        Gender gender,

        @Schema(description = "生日")
        @NotNull(message = "birthDate must not be null")
        @Past(message = "birthDate must be in the past")
        LocalDate birthDate,

        @Schema(description = "身高，单位 cm")
        @NotNull(message = "height must not be null")
        @DecimalMin(value = "50.0", message = "height must be at least 50cm")
        BigDecimal height,

        @Schema(description = "活动量等级")
        @NotNull(message = "activityLevel must not be null")
        ActivityLevel activityLevel,

        @Schema(description = "每日目标热量，单位 kcal")
        @NotNull(message = "dailyCalorieTarget must not be null")
        @Positive(message = "dailyCalorieTarget must be greater than 0")
        Integer dailyCalorieTarget,

        @Schema(description = "当前体重，单位 kg")
        @NotNull(message = "currentWeight must not be null")
        @DecimalMin(value = "0.1", message = "currentWeight must be greater than 0")
        BigDecimal currentWeight,

        @Schema(description = "目标体重，单位 kg")
        @NotNull(message = "targetWeight must not be null")
        @DecimalMin(value = "0.1", message = "targetWeight must be greater than 0")
        BigDecimal targetWeight,

        @Schema(description = "用户自定义基础代谢 BMR，单位 kcal，可为空")
        @Positive(message = "customBmr must be greater than 0")
        Integer customBmr
) {
}
