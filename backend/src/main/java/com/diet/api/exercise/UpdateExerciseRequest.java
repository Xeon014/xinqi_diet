package com.diet.api.exercise;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateExerciseRequest(
        @NotBlank(message = "name must not be blank")
        @Size(max = 80, message = "name length must be <= 80")
        String name,

        @NotNull(message = "metValue must not be null")
        @DecimalMin(value = "0.1", message = "metValue must be greater than 0")
        BigDecimal metValue,

        @NotBlank(message = "category must not be blank")
        @Size(max = 80, message = "category length must be <= 80")
        String category
) {
}
