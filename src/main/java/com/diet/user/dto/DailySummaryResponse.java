package com.diet.user.dto;

import com.diet.record.dto.MealRecordResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DailySummaryResponse(
        Long userId,
        LocalDate date,
        Integer targetCalories,
        BigDecimal consumedCalories,
        BigDecimal remainingCalories,
        boolean exceededTarget,
        List<MealRecordResponse> records
) {
}
