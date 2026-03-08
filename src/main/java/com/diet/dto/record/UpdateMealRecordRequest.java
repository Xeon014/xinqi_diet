package com.diet.dto.record;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record UpdateMealRecordRequest(
        @NotNull(message = "quantityInGram must not be null")
        @DecimalMin(value = "0.1", message = "quantityInGram must be greater than 0")
        BigDecimal quantityInGram
) {
}
