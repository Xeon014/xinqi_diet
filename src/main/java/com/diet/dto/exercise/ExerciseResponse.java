package com.diet.dto.exercise;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ExerciseResponse(
        Long id,
        String name,
        BigDecimal metValue,
        String category,
        String source,
        String sourceRef,
        String aliases,
        Boolean isBuiltin,
        LocalDateTime createdAt
) {
}