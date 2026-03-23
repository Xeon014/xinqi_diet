package com.diet.dto.exercise;

import com.diet.domain.exercise.ExerciseIntensity;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record CreateExerciseRecordRequest(
        @NotNull(message = "exerciseId must not be null")
        Long exerciseId,
        @NotNull(message = "durationMinutes must not be null")
        @Min(value = 1, message = "durationMinutes must be greater than 0")
        Integer durationMinutes,
        ExerciseIntensity intensityLevel,
        @NotNull(message = "recordDate must not be null")
        LocalDate recordDate
) {
}
