package com.diet.dto.user;

import com.diet.domain.exercise.ExerciseIntensity;
import com.diet.domain.record.MealType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record DailyRecordResponse(
        DailyRecordType recordType,
        Long recordId,
        LocalDate recordDate,
        LocalDateTime createdAt,
        MealType mealType,
        String foodName,
        BigDecimal quantityInGram,
        String exerciseName,
        Integer durationMinutes,
        ExerciseIntensity intensityLevel,
        BigDecimal totalCalories
) {
}