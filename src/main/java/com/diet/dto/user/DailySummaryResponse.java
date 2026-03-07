package com.diet.dto.user;

import com.diet.dto.record.MealRecordResponse;
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