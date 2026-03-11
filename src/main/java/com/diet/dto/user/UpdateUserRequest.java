package com.diet.dto.user;

import com.diet.domain.user.ActivityLevel;
import com.diet.domain.user.Gender;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

@Schema(description = "更新用户请求")
public record UpdateUserRequest(
        @Schema(description = "用户昵称，不传表示不更新")
        @Size(max = 20, message = "name length must be less than or equal to 20")
        String name,

        @Schema(description = "性别")
        Gender gender,

        @Schema(description = "生日")
        @Past(message = "birthDate must be in the past")
        LocalDate birthDate,

        @Schema(description = "身高，单位 cm")
        @DecimalMin(value = "50.0", message = "height must be at least 50cm")
        BigDecimal height,

        @Schema(description = "活动量等级")
        ActivityLevel activityLevel,

        @Schema(description = "每日目标热量，单位 kcal")
        @Positive(message = "dailyCalorieTarget must be greater than 0")
        Integer dailyCalorieTarget,

        @Schema(description = "当前体重，单位 kg")
        @DecimalMin(value = "0.1", message = "currentWeight must be greater than 0")
        BigDecimal currentWeight,

        @Schema(description = "目标体重，单位 kg")
        @DecimalMin(value = "0.1", message = "targetWeight must be greater than 0")
        BigDecimal targetWeight,

        @Schema(description = "用户自定义基础代谢 BMR，单位 kcal，可为空")
        @Positive(message = "customBmr must be greater than 0")
        Integer customBmr,

        @Schema(description = "是否切换为公式计算 BMR，true 时清空 customBmr")
        Boolean useFormulaBmr
) {
}
