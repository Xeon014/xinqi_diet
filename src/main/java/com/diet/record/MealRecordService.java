package com.diet.record;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.diet.common.NotFoundException;
import com.diet.food.Food;
import com.diet.food.FoodService;
import com.diet.record.dto.CreateMealRecordRequest;
import com.diet.record.dto.MealRecordResponse;
import com.diet.user.UserProfile;
import com.diet.user.UserProfileRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class MealRecordService {

    private final MealRecordRepository mealRecordRepository;
    private final UserProfileRepository userProfileRepository;
    private final FoodService foodService;

    public MealRecordService(MealRecordRepository mealRecordRepository, UserProfileRepository userProfileRepository,
                             FoodService foodService) {
        this.mealRecordRepository = mealRecordRepository;
        this.userProfileRepository = userProfileRepository;
        this.foodService = foodService;
    }

    public MealRecordResponse create(CreateMealRecordRequest request) {
        UserProfile user = userProfileRepository.selectById(request.userId());
        if (user == null) {
            throw new NotFoundException("user not found, id=" + request.userId());
        }

        Food food = foodService.findEntity(request.foodId());
        BigDecimal totalCalories = food.getCaloriesPer100g()
                .multiply(request.quantityInGram())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        MealRecord record = new MealRecord(
                user.getId(),
                food.getId(),
                request.mealType(),
                request.quantityInGram(),
                totalCalories,
                request.recordDate()
        );
        mealRecordRepository.insert(record);
        return toResponse(record, food.getName());
    }

    @Transactional(readOnly = true)
    public List<MealRecordResponse> findByUserAndDate(Long userId, LocalDate date) {
        List<MealRecord> records = mealRecordRepository.selectList(new LambdaQueryWrapper<MealRecord>()
                .eq(MealRecord::getUserId, userId)
                .eq(MealRecord::getRecordDate, date)
                .orderByAsc(MealRecord::getCreatedAt));
        Map<Long, String> foodNames = loadFoodNames(records);
        return records.stream()
                .map(record -> toResponse(record, foodNames.get(record.getFoodId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MealRecord> findEntitiesByUserAndDate(Long userId, LocalDate date) {
        return mealRecordRepository.selectList(new LambdaQueryWrapper<MealRecord>()
                .eq(MealRecord::getUserId, userId)
                .eq(MealRecord::getRecordDate, date)
                .orderByAsc(MealRecord::getCreatedAt));
    }

    @Transactional(readOnly = true)
    public List<MealRecord> findEntitiesByUserAndDateRange(Long userId, LocalDate startDate, LocalDate endDate) {
        return mealRecordRepository.selectList(new LambdaQueryWrapper<MealRecord>()
                .eq(MealRecord::getUserId, userId)
                .between(MealRecord::getRecordDate, startDate, endDate)
                .orderByAsc(MealRecord::getRecordDate)
                .orderByAsc(MealRecord::getCreatedAt));
    }

    @Transactional(readOnly = true)
    public Map<Long, String> loadFoodNames(List<MealRecord> records) {
        return records.stream()
                .map(MealRecord::getFoodId)
                .distinct()
                .map(foodService::findEntity)
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
}