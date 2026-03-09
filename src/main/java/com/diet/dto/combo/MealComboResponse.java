package com.diet.dto.combo;

import com.diet.domain.record.MealType;
import java.time.LocalDateTime;
import java.util.List;

public record MealComboResponse(
        Long id,
        Long userId,
        String name,
        String description,
        MealType mealType,
        List<MealComboItemResponse> items,
        LocalDateTime createdAt
) {
}
