package com.diet.api.combo;

import java.time.LocalDateTime;
import java.util.List;

public record MealComboResponse(
        Long id,
        Long userId,
        String name,
        String description,
        List<MealComboItemResponse> items,
        LocalDateTime createdAt
) {
}
