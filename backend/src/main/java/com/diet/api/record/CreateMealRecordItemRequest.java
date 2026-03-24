package com.diet.api.record;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CreateMealRecordItemRequest(
        @NotNull(message = "foodId must not be null")
        Long foodId,
        @NotNull(message = "quantityInGram must not be null")
        @DecimalMin(value = "0.1", message = "quantityInGram must be greater than 0")
        BigDecimal quantityInGram
) {
}