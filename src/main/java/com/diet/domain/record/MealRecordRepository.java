package com.diet.domain.record;

import java.time.LocalDate;
import java.util.List;

public interface MealRecordRepository {

    long count();

    void save(MealRecord mealRecord);

    List<MealRecord> findByUserAndDate(Long userId, LocalDate date);

    List<MealRecord> findByUserAndDateRange(Long userId, LocalDate startDate, LocalDate endDate);
}
