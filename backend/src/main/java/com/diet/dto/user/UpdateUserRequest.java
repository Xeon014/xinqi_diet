package com.diet.dto.user;

import com.diet.domain.user.ActivityLevel;
import com.diet.domain.user.Gender;
import com.diet.domain.user.GoalCalorieStrategy;
import com.diet.domain.user.GoalMode;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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

        @Schema(description = "活动量等级（兼容保留，不参与热量计算）")
        ActivityLevel activityLevel,

        @Schema(description = "每日目标热量（兼容保留，后端会反推为目标差值），单位 kcal")
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

        @Schema(description = "用户自定义基础日消耗，单位 kcal，可为空")
        @Positive(message = "customTdee must be greater than 0")
        Integer customTdee,

        @Schema(description = "热量目标模式：LOSE/MAINTAIN/GAIN")
        GoalMode goalMode,

        @Schema(description = "目标热量差值，单位 kcal，负数表示减脂，正数表示增重")
        @Min(value = -1000, message = "goalCalorieDelta must be greater than or equal to -1000")
        @Max(value = 1000, message = "goalCalorieDelta must be less than or equal to 1000")
        Integer goalCalorieDelta,

        @Schema(description = "预期达到目标体重的日期")
        LocalDate goalTargetDate,

        @Schema(description = "目标热量策略：SMART/MANUAL")
        GoalCalorieStrategy goalCalorieStrategy,

        @Schema(description = "是否在初始引导完成时补写首条体重记录，true 时仅在当前无体重历史时写入")
        Boolean seedInitialWeightRecord,

        @Schema(description = "是否切换为公式计算 BMR，true 时清空 customBmr")
        Boolean useFormulaBmr
) {
}
