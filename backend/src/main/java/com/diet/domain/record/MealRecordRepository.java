package com.diet.domain.record;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MealRecordRepository {

    long count();

    void save(MealRecord mealRecord);

    Optional<MealRecord> findById(Long id);

    void deleteById(Long id);

    long countByFoodId(Long foodId);

    List<MealRecord> findByUserAndDate(Long userId, LocalDate date);

    List<MealRecord> findByUserAndDateAndMealType(Long userId, LocalDate date, MealType mealType);

    List<MealRecord> findByUserAndDateRange(Long userId, LocalDate startDate, LocalDate endDate);

    List<MealRecord> findByUserWithCursor(
            Long userId,
            MealType mealType,
            LocalDate cursorRecordDate,
            LocalDateTime cursorCreatedAt,
            Long cursorId,
            int limit
    );
}
