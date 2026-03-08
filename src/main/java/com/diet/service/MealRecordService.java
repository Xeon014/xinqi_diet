package com.diet.service;

import com.diet.common.NotFoundException;
import com.diet.domain.food.Food;
import com.diet.domain.food.FoodRepository;
import com.diet.domain.record.MealRecord;
import com.diet.domain.record.MealRecordRepository;
import com.diet.domain.record.MealType;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.record.CreateMealRecordBatchRequest;
import com.diet.dto.record.CreateMealRecordItemRequest;
import com.diet.dto.record.CreateMealRecordRequest;
import com.diet.dto.record.MealRecordResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class MealRecordService {

    private final MealRecordRepository mealRecordRepository;

    private final UserProfileRepository userProfileRepository;

    private final FoodRepository foodRepository;

    public MealRecordService(
            MealRecordRepository mealRecordRepository,
            UserProfileRepository userProfileRepository,
            FoodRepository foodRepository
    ) {
        this.mealRecordRepository = mealRecordRepository;
        this.userProfileRepository = userProfileRepository;
        this.foodRepository = foodRepository;
    }

    public MealRecordResponse create(Long userId, CreateMealRecordRequest request) {
        UserProfile user = getUser(userId);
        Food food = getFood(request.foodId());
        MealRecord record = buildRecord(
                user.getId(),
                food,
                request.mealType(),
                request.quantityInGram(),
                request.recordDate()
        );
        mealRecordRepository.save(record);
        return toResponse(record, food);
    }

    public List<MealRecordResponse> createBatch(Long userId, CreateMealRecordBatchRequest request) {
        UserProfile user = getUser(userId);
        Map<Long, BigDecimal> mergedItems = mergeItems(request.items());
        Map<Long, Food> foods = loadFoodsByIds(mergedItems.keySet());
        List<MealRecordResponse> responses = new ArrayList<>();

        for (Map.Entry<Long, BigDecimal> entry : mergedItems.entrySet()) {
            Food food = foods.get(entry.getKey());
            MealRecord record = buildRecord(
                    user.getId(),
                    food,
                    request.mealType(),
                    entry.getValue(),
                    request.recordDate()
            );
            mealRecordRepository.save(record);
            responses.add(toResponse(record, food));
        }

        return responses;
    }

    public MealRecordResponse updateQuantity(Long userId, Long recordId, BigDecimal quantityInGram) {
        getUser(userId);
        MealRecord record = getOwnedRecord(userId, recordId);
        Food food = getFood(record.getFoodId());
        record.setQuantityInGram(quantityInGram);
        record.setTotalCalories(MealRecord.calculateTotalCalories(food.getCaloriesPer100g(), quantityInGram));
        mealRecordRepository.save(record);
        return toResponse(record, food);
    }

    public boolean deleteById(Long userId, Long recordId) {
        getUser(userId);
        MealRecord record = getOwnedRecord(userId, recordId);
        mealRecordRepository.deleteById(record.getId());
        return true;
    }

    @Transactional(readOnly = true)
    public List<MealRecordResponse> findByUserAndDate(Long userId, LocalDate date) {
        return findByUserAndDate(userId, date, null);
    }

    @Transactional(readOnly = true)
    public List<MealRecordResponse> findByUserAndDate(Long userId, LocalDate date, MealType mealType) {
        List<MealRecord> records = mealType == null
                ? mealRecordRepository.findByUserAndDate(userId, date)
                : mealRecordRepository.findByUserAndDateAndMealType(userId, date, mealType);

        return records.stream()
                .map(record -> {
                    Food food = getFood(record.getFoodId());
                    return toResponse(record, food);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MealRecord> findEntitiesByUserAndDate(Long userId, LocalDate date) {
        return mealRecordRepository.findByUserAndDate(userId, date);
    }

    @Transactional(readOnly = true)
    public List<MealRecord> findEntitiesByUserAndDateRange(Long userId, LocalDate startDate, LocalDate endDate) {
        return mealRecordRepository.findByUserAndDateRange(userId, startDate, endDate);
    }

    public MealRecordResponse toResponse(MealRecord record, Food food) {
        return new MealRecordResponse(
                record.getId(),
                record.getUserId(),
                record.getFoodId(),
                food.getName(),
                food.getCaloriesPer100g(),
                food.getProteinPer100g(),
                food.getCarbsPer100g(),
                food.getFatPer100g(),
                record.getMealType(),
                record.getQuantityInGram(),
                record.getTotalCalories(),
                record.getRecordDate(),
                record.getCreatedAt()
        );
    }

    private MealRecord buildRecord(Long userId, Food food, MealType mealType, BigDecimal quantityInGram, LocalDate recordDate) {
        BigDecimal totalCalories = MealRecord.calculateTotalCalories(food.getCaloriesPer100g(), quantityInGram);
        return new MealRecord(userId, food.getId(), mealType, quantityInGram, totalCalories, recordDate);
    }

    private Map<Long, BigDecimal> mergeItems(List<CreateMealRecordItemRequest> items) {
        LinkedHashMap<Long, BigDecimal> merged = new LinkedHashMap<>();
        for (CreateMealRecordItemRequest item : items) {
            merged.merge(item.foodId(), item.quantityInGram(), BigDecimal::add);
        }
        return merged;
    }

    private Map<Long, Food> loadFoodsByIds(Iterable<Long> foodIds) {
        LinkedHashMap<Long, Food> foods = new LinkedHashMap<>();
        for (Long foodId : foodIds) {
            foods.put(foodId, getFood(foodId));
        }
        return foods;
    }

    private MealRecord getOwnedRecord(Long userId, Long recordId) {
        MealRecord record = mealRecordRepository.findById(recordId)
                .orElseThrow(() -> new NotFoundException("record not found, id=" + recordId));
        if (!record.getUserId().equals(userId)) {
            throw new NotFoundException("record not found, id=" + recordId);
        }
        return record;
    }

    private UserProfile getUser(Long id) {
        return userProfileRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("user not found, id=" + id));
    }

    private Food getFood(Long id) {
        return foodRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("food not found, id=" + id));
    }
}
