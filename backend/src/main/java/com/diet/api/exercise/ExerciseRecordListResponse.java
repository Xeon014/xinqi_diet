package com.diet.api.exercise;

import java.time.LocalDate;
import java.util.List;

public record ExerciseRecordListResponse(
        Long userId,
        LocalDate date,
        List<ExerciseRecordResponse> records,
        int total
) {
}