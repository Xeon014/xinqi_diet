package com.diet.domain.exercise;

import java.math.BigDecimal;

public enum ExerciseIntensity {
    LOW(new BigDecimal("0.8")),
    MEDIUM(BigDecimal.ONE),
    HIGH(new BigDecimal("1.2"));

    private final BigDecimal factor;

    ExerciseIntensity(BigDecimal factor) {
        this.factor = factor;
    }

    public BigDecimal factor() {
        return factor;
    }
}