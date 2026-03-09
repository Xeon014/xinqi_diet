package com.diet.dto.combo;

import com.diet.domain.record.MealType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateMealComboRequest(
        @NotNull(message = "userId must not be null")
        Long userId,

        @NotBlank(message = "name must not be blank")
        @Size(max = 50, message = "name length must be <= 50")
        String name,

        @Size(max = 200, message = "description length must be <= 200")
        String description,

        @NotNull(message = "mealType must not be null")
        MealType mealType,

        @Valid
        @NotEmpty(message = "items must not be empty")
        List<CreateMealComboItemRequest> items
) {
}
