package com.diet.dto.record;

import com.diet.domain.record.MealType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

public record CreateMealRecordBatchRequest(
        @NotNull(message = "userId must not be null")
        Long userId,
        @NotNull(message = "mealType must not be null")
        MealType mealType,
        @NotNull(message = "recordDate must not be null")
        LocalDate recordDate,
        @NotEmpty(message = "items must not be empty")
        List<@Valid CreateMealRecordItemRequest> items
) {
}