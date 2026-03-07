package com.diet.dto.user;

import com.diet.domain.user.ActivityLevel;
import com.diet.domain.user.Gender;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record CreateUserRequest(
        @NotBlank(message = "name must not be blank")
        String name,
        @NotNull(message = "gender must not be null")
        Gender gender,
        @NotNull(message = "age must not be null")
        @Min(value = 1, message = "age must be at least 1")
        @Max(value = 120, message = "age must be at most 120")
        Integer age,
        @NotNull(message = "height must not be null")
        @DecimalMin(value = "50.0", message = "height must be at least 50cm")
        BigDecimal height,
        @NotNull(message = "activityLevel must not be null")
        ActivityLevel activityLevel,
        @NotNull(message = "dailyCalorieTarget must not be null")
        @Positive(message = "dailyCalorieTarget must be greater than 0")
        Integer dailyCalorieTarget,
        @NotNull(message = "currentWeight must not be null")
        @DecimalMin(value = "0.1", message = "currentWeight must be greater than 0")
        BigDecimal currentWeight,
        @NotNull(message = "targetWeight must not be null")
        @DecimalMin(value = "0.1", message = "targetWeight must be greater than 0")
        BigDecimal targetWeight
) {
}