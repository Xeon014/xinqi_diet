package com.diet.service;

import com.diet.domain.food.Food;
import com.diet.domain.record.MealRecord;
import com.diet.domain.record.MealRecordRepository;
import com.diet.domain.user.UserProfile;
import com.diet.dto.record.CreateMealRecordBatchRequest;
import com.diet.dto.record.CreateMealRecordRequest;
import com.diet.dto.record.MealRecordResponse;
import com.diet.dto.record.UpdateMealRecordRequest;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class MealRecordCommandService {

    private final MealRecordRepository mealRecordRepository;

    private final MealRecordSupport mealRecordSupport;

    public MealRecordCommandService(
            MealRecordRepository mealRecordRepository,
            MealRecordSupport mealRecordSupport
    ) {
        this.mealRecordRepository = mealRecordRepository;
        this.mealRecordSupport = mealRecordSupport;
    }

    public MealRecordResponse create(Long userId, CreateMealRecordRequest request) {
        UserProfile user = mealRecordSupport.getUser(userId);
        Food food = mealRecordSupport.getAccessibleFood(userId, request.foodId());
        MealRecord record = mealRecordSupport.buildRecord(
                user.getId(),
                food,
                request.mealType(),
                request.quantityInGram(),
                request.recordDate()
        );
        mealRecordRepository.save(record);
        return mealRecordSupport.toResponse(record, food);
    }

    public List<MealRecordResponse> createBatch(Long userId, CreateMealRecordBatchRequest request) {
        UserProfile user = mealRecordSupport.getUser(userId);
        Map<Long, BigDecimal> mergedItems = mealRecordSupport.mergeItems(request.items());
        Map<Long, Food> foods = mealRecordSupport.loadFoodsByIds(userId, mergedItems.keySet());
        List<MealRecordResponse> responses = new ArrayList<>();

        for (Map.Entry<Long, BigDecimal> entry : mergedItems.entrySet()) {
            Food food = foods.get(entry.getKey());
            MealRecord record = mealRecordSupport.buildRecord(
                    user.getId(),
                    food,
                    request.mealType(),
                    entry.getValue(),
                    request.recordDate()
            );
            mealRecordRepository.save(record);
            responses.add(mealRecordSupport.toResponse(record, food));
        }

        return responses;
    }

    public MealRecordResponse updateRecord(Long userId, Long recordId, UpdateMealRecordRequest request) {
        mealRecordSupport.getUser(userId);
        MealRecord record = mealRecordSupport.getOwnedRecord(userId, recordId);
        Food food = mealRecordSupport.getAccessibleFood(userId, record.getFoodId());
        record.setQuantityInGram(request.quantityInGram());
        record.setMealType(request.mealType());
        record.setRecordDate(request.recordDate());
        record.setTotalCalories(MealRecord.calculateTotalCalories(food.getCaloriesPer100g(), request.quantityInGram()));
        mealRecordRepository.save(record);
        return mealRecordSupport.toResponse(record, food);
    }

    public boolean deleteById(Long userId, Long recordId) {
        mealRecordSupport.getUser(userId);
        MealRecord record = mealRecordSupport.getOwnedRecord(userId, recordId);
        mealRecordRepository.deleteById(record.getId());
        return true;
    }
}
