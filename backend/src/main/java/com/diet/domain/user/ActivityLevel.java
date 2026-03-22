package com.diet.domain.user;

import lombok.Getter;

import java.math.BigDecimal;

@Getter
public enum ActivityLevel {
    SEDENTARY(new BigDecimal("1.20")),
    LIGHT(new BigDecimal("1.375")),
    MODERATE(new BigDecimal("1.55")),
    ACTIVE(new BigDecimal("1.725")),
    VERY_ACTIVE(new BigDecimal("1.90"));

    private final BigDecimal multiplier;

    ActivityLevel(BigDecimal multiplier) {
        this.multiplier = multiplier;
    }

}