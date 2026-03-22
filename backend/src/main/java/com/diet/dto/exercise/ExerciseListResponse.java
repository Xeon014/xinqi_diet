package com.diet.dto.exercise;

import java.util.List;

public record ExerciseListResponse(
        List<ExerciseResponse> exercises,
        int total
) {
}