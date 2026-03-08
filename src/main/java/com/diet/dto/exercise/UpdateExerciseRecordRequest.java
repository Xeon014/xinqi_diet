package com.diet.dto.exercise;

import com.diet.domain.exercise.ExerciseIntensity;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateExerciseRecordRequest(
        @NotNull(message = "durationMinutes must not be null")
        @Min(value = 1, message = "durationMinutes must be greater than 0")
        Integer durationMinutes,
        @NotNull(message = "intensityLevel must not be null")
        ExerciseIntensity intensityLevel
) {
}