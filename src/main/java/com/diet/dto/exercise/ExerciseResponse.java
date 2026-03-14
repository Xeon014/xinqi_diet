package com.diet.dto.exercise;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ExerciseResponse(
        Long id,
        Long userId,
        String name,
        BigDecimal metValue,
        String category,
        String source,
        String sourceRef,
        String aliases,
        @JsonProperty("isBuiltin")
        Boolean isBuiltin,
        LocalDateTime createdAt
) {
}
