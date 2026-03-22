package com.diet.dto.combo;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record UpdateMealComboRequest(
        @NotBlank(message = "name must not be blank")
        @Size(max = 50, message = "name length must be <= 50")
        String name,

        @Size(max = 200, message = "description length must be <= 200")
        String description,

        @Valid
        @NotEmpty(message = "items must not be empty")
        List<CreateMealComboItemRequest> items
) {
}
