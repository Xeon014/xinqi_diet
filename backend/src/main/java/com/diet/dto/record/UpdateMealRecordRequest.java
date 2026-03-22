package com.diet.dto.record;

import com.diet.domain.record.MealType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record UpdateMealRecordRequest(
        @NotNull(message = "quantityInGram must not be null")
        @DecimalMin(value = "0.1", message = "quantityInGram must be greater than 0")
        BigDecimal quantityInGram,
        @NotNull(message = "mealType must not be null")
        MealType mealType,
        @NotNull(message = "recordDate must not be null")
        LocalDate recordDate
) {
}
