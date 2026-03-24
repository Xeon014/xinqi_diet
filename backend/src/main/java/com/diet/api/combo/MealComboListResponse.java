package com.diet.api.combo;

import java.util.List;

public record MealComboListResponse(
        List<MealComboResponse> combos,
        int total
) {
}
