package com.diet.service;

import com.diet.common.NotFoundException;
import com.diet.domain.food.Food;
import com.diet.domain.food.FoodRepository;
import com.diet.domain.record.MealRecord;
import com.diet.domain.record.MealRecordRepository;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.record.CreateMealRecordRequest;
import com.diet.dto.record.MealRecordResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
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
        BigDecimal totalCalories = MealRecord.calculateTotalCalories(food.getCaloriesPer100g(), request.quantityInGram());

        MealRecord record = new MealRecord(
                user.getId(),
                food.getId(),
                request.mealType(),
                request.quantityInGram(),
                totalCalories,
                request.recordDate()
        );
        mealRecordRepository.save(record);
        return toResponse(record, food.getName());
    }

    @Transactional(readOnly = true)
    public List<MealRecordResponse> findByUserAndDate(Long userId, LocalDate date) {
        List<MealRecord> records = findEntitiesByUserAndDate(userId, date);
        Map<Long, String> foodNames = loadFoodNames(records);
        return records.stream()
                .map(record -> toResponse(record, foodNames.get(record.getFoodId())))
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

    @Transactional(readOnly = true)
    public Map<Long, String> loadFoodNames(List<MealRecord> records) {
        return records.stream()
                .map(MealRecord::getFoodId)
                .distinct()
                .map(this::getFood)
                .collect(Collectors.toMap(Food::getId, Food::getName));
    }

    public MealRecordResponse toResponse(MealRecord record, String foodName) {
        return new MealRecordResponse(
                record.getId(),
                record.getUserId(),
                record.getFoodId(),
                foodName,
                record.getMealType(),
                record.getQuantityInGram(),
                record.getTotalCalories(),
                record.getRecordDate(),
                record.getCreatedAt()
        );
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
