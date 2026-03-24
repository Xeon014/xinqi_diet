package com.diet.api.exercise;

import com.diet.domain.exercise.ExerciseIntensity;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ExerciseRecordResponse(
        Long id,
        Long userId,
        Long exerciseId,
        String exerciseName,
        BigDecimal metValue,
        String category,
        Integer durationMinutes,
        ExerciseIntensity intensityLevel,
        BigDecimal intensityFactor,
        BigDecimal weightKgSnapshot,
        BigDecimal totalCalories,
        LocalDate recordDate,
        LocalDateTime createdAt
) {
}