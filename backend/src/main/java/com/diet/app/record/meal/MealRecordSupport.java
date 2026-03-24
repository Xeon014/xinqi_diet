package com.diet.app.record.meal;

import com.diet.types.common.NotFoundException;
import com.diet.domain.food.Food;
import com.diet.domain.food.FoodCalorieUnit;
import com.diet.domain.food.FoodQuantityUnit;
import com.diet.domain.food.FoodRepository;
import com.diet.domain.record.MealRecord;
import com.diet.domain.record.MealRecordRepository;
import com.diet.domain.record.MealType;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.api.record.CreateMealRecordItemRequest;
import com.diet.api.record.MealRecordResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
class MealRecordSupport {

    private final MealRecordRepository mealRecordRepository;

    private final UserProfileRepository userProfileRepository;

    private final FoodRepository foodRepository;

    MealRecordSupport(
            MealRecordRepository mealRecordRepository,
            UserProfileRepository userProfileRepository,
            FoodRepository foodRepository
    ) {
        this.mealRecordRepository = mealRecordRepository;
        this.userProfileRepository = userProfileRepository;
        this.foodRepository = foodRepository;
    }

    MealRecordResponse toResponse(MealRecord record, Food food) {
        return new MealRecordResponse(
                record.getId(),
                record.getUserId(),
                record.getFoodId(),
                food.getName(),
                food.getCaloriesPer100g(),
                food.getCalorieUnit() == null ? FoodCalorieUnit.KCAL : food.getCalorieUnit(),
                food.getProteinPer100g(),
                food.getCarbsPer100g(),
                food.getFatPer100g(),
                record.getMealType(),
                food.getQuantityUnit() == null ? FoodQuantityUnit.G : food.getQuantityUnit(),
                record.getQuantityInGram(),
                record.getTotalCalories(),
                record.getRecordDate(),
                record.getCreatedAt()
        );
    }

    MealRecord buildRecord(Long userId, Food food, MealType mealType, BigDecimal quantityInGram, LocalDate recordDate) {
        BigDecimal totalCalories = MealRecord.calculateTotalCalories(food.getCaloriesPer100g(), quantityInGram);
        return new MealRecord(userId, food.getId(), mealType, quantityInGram, totalCalories, recordDate);
    }

    Map<Long, BigDecimal> mergeItems(List<CreateMealRecordItemRequest> items) {
        LinkedHashMap<Long, BigDecimal> merged = new LinkedHashMap<>();
        for (CreateMealRecordItemRequest item : items) {
            merged.merge(item.foodId(), item.quantityInGram(), BigDecimal::add);
        }
        return merged;
    }

    Map<Long, Food> loadFoodsByIds(Long userId, Iterable<Long> foodIds) {
        LinkedHashMap<Long, Food> foods = new LinkedHashMap<>();
        for (Long foodId : foodIds) {
            foods.put(foodId, getAccessibleFood(userId, foodId));
        }
        return foods;
    }

    UserProfile getUser(Long id) {
        return userProfileRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("user not found, id=" + id));
    }

    MealRecord getOwnedRecord(Long userId, Long recordId) {
        MealRecord record = mealRecordRepository.findById(recordId)
                .orElseThrow(() -> new NotFoundException("record not found, id=" + recordId));
        if (!record.getUserId().equals(userId)) {
            throw new NotFoundException("record not found, id=" + recordId);
        }
        return record;
    }

    Food getAccessibleFood(Long userId, Long id) {
        if (userId != null) {
            return foodRepository.findAccessibleById(userId, id)
                    .orElseThrow(() -> new NotFoundException("food not found, id=" + id));
        }
        return foodRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("food not found, id=" + id));
    }
}
