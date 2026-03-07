package com.diet.user.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record CreateUserRequest(
        @NotBlank(message = "name must not be blank")
        String name,
        @Email(message = "email format is invalid")
        @NotBlank(message = "email must not be blank")
        String email,
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