package com.diet.domain.record;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MealRecordRepository {

    long count();

    void save(MealRecord mealRecord);

    Optional<MealRecord> findById(Long id);

    void deleteById(Long id);

    List<MealRecord> findByUserAndDate(Long userId, LocalDate date);

    List<MealRecord> findByUserAndDateAndMealType(Long userId, LocalDate date, MealType mealType);

    List<MealRecord> findByUserAndDateRange(Long userId, LocalDate startDate, LocalDate endDate);
}
