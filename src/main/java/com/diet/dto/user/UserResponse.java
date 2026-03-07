package com.diet.dto.user;

import com.diet.domain.user.ActivityLevel;
import com.diet.domain.user.Gender;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String name,
        Gender gender,
        Integer age,
        BigDecimal height,
        ActivityLevel activityLevel,
        Integer dailyCalorieTarget,
        BigDecimal currentWeight,
        BigDecimal targetWeight,
        BigDecimal bmr,
        BigDecimal tdee,
        LocalDateTime createdAt
) {
}