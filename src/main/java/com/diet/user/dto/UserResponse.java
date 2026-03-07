package com.diet.user.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String name,
        String email,
        Integer dailyCalorieTarget,
        BigDecimal currentWeight,
        BigDecimal targetWeight,
        LocalDateTime createdAt
) {
}
