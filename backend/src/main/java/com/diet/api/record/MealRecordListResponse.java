package com.diet.api.record;

import java.time.LocalDate;
import java.util.List;

public record MealRecordListResponse(
        Long userId,
        LocalDate date,
        List<MealRecordResponse> records,
        int total
) {
}