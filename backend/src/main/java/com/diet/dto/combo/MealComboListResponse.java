package com.diet.dto.combo;

import java.util.List;

public record MealComboListResponse(
        List<MealComboResponse> combos,
        int total
) {
}
