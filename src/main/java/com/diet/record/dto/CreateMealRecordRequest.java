package com.diet.record.dto;

import com.diet.record.MealType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateMealRecordRequest(
        @NotNull(message = "userId must not be null")
        Long userId,
        @NotNull(message = "foodId must not be null")
        Long foodId,
        @NotNull(message = "mealType must not be null")
        MealType mealType,
        @NotNull(message = "quantityInGram must not be null")
        @DecimalMin(value = "0.1", message = "quantityInGram must be greater than 0")
        BigDecimal quantityInGram,
        @NotNull(message = "recordDate must not be null")
        LocalDate recordDate
) {
}