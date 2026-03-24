package com.diet.app.record.meal;

import com.diet.domain.food.Food;
import com.diet.domain.record.MealRecord;
import com.diet.domain.record.MealRecordRepository;
import com.diet.domain.record.MealType;
import com.diet.api.record.MealRecordResponse;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class MealRecordQueryService {

    private final MealRecordRepository mealRecordRepository;

    private final MealRecordSupport mealRecordSupport;

    public MealRecordQueryService(
            MealRecordRepository mealRecordRepository,
            MealRecordSupport mealRecordSupport
    ) {
        this.mealRecordRepository = mealRecordRepository;
        this.mealRecordSupport = mealRecordSupport;
    }

    public List<MealRecordResponse> findByUserAndDate(Long userId, LocalDate date) {
        return findByUserAndDate(userId, date, null);
    }

    public List<MealRecordResponse> findByUserAndDate(Long userId, LocalDate date, MealType mealType) {
        List<MealRecord> records = mealType == null
                ? mealRecordRepository.findByUserAndDate(userId, date)
                : mealRecordRepository.findByUserAndDateAndMealType(userId, date, mealType);

        return records.stream()
                .map(record -> {
                    Food food = mealRecordSupport.getAccessibleFood(userId, record.getFoodId());
                    return mealRecordSupport.toResponse(record, food);
                })
                .toList();
    }

    public List<MealRecord> findRecordsByUserAndDate(Long userId, LocalDate date) {
        return mealRecordRepository.findByUserAndDate(userId, date);
    }

    public List<MealRecord> findRecordsByUserAndDateRange(Long userId, LocalDate startDate, LocalDate endDate) {
        return mealRecordRepository.findByUserAndDateRange(userId, startDate, endDate);
    }
}
