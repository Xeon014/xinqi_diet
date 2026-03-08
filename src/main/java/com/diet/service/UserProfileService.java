package com.diet.service;

import com.diet.common.NotFoundException;
import com.diet.domain.food.Food;
import com.diet.domain.food.FoodRepository;
import com.diet.domain.record.MealRecord;
import com.diet.domain.record.MealRecordRepository;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.record.MealRecordResponse;
import com.diet.dto.user.CreateUserRequest;
import com.diet.dto.user.DailySummaryResponse;
import com.diet.dto.user.ProgressPointResponse;
import com.diet.dto.user.ProgressSummaryResponse;
import com.diet.dto.user.UpdateUserRequest;
import com.diet.dto.user.UserResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserProfileService {

    private static final String DEFAULT_NAME = "微信用户";

    private final UserProfileRepository userProfileRepository;

    private final MealRecordRepository mealRecordRepository;

    private final FoodRepository foodRepository;

    public UserProfileService(
            UserProfileRepository userProfileRepository,
            MealRecordRepository mealRecordRepository,
            FoodRepository foodRepository
    ) {
        this.userProfileRepository = userProfileRepository;
        this.mealRecordRepository = mealRecordRepository;
        this.foodRepository = foodRepository;
    }

    public UserResponse create(CreateUserRequest request) {
        UserProfile user = new UserProfile(
                normalizeName(request.name()),
                request.gender(),
                request.birthDate(),
                request.height(),
                request.activityLevel(),
                request.dailyCalorieTarget(),
                request.currentWeight(),
                request.targetWeight(),
                request.customBmr()
        );
        userProfileRepository.save(user);
        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> findAll() {
        return userProfileRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse findById(Long id) {
        return toResponse(getUser(id));
    }

    public UserResponse update(Long id, UpdateUserRequest request) {
        UserProfile user = getUser(id);
        user.updateProfile(
                normalizeName(request.name() == null ? user.getName() : request.name()),
                request.gender(),
                request.birthDate(),
                request.height(),
                request.activityLevel(),
                request.dailyCalorieTarget(),
                request.currentWeight(),
                request.targetWeight(),
                request.customBmr()
        );
        userProfileRepository.update(user);
        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public DailySummaryResponse getDailySummary(Long userId, LocalDate date) {
        UserProfile user = getUser(userId);
        List<MealRecord> records = mealRecordRepository.findByUserAndDate(userId, date);
        Map<Long, Food> foods = loadFoods(records);
        BigDecimal consumed = sumCalories(records);
        BigDecimal remaining = BigDecimal.valueOf(user.getDailyCalorieTarget()).subtract(consumed);

        BigDecimal proteinIntake = sumNutrient(records, foods, Food::getProteinPer100g);
        BigDecimal carbsIntake = sumNutrient(records, foods, Food::getCarbsPer100g);
        BigDecimal fatIntake = sumNutrient(records, foods, Food::getFatPer100g);

        List<MealRecordResponse> responses = records.stream()
                .map(record -> toMealRecordResponse(record, foods.get(record.getFoodId()).getName()))
                .toList();

        return new DailySummaryResponse(
                userId,
                date,
                user.getDailyCalorieTarget(),
                consumed,
                remaining,
                remaining.compareTo(BigDecimal.ZERO) < 0,
                proteinIntake,
                carbsIntake,
                fatIntake,
                responses
        );
    }

    @Transactional(readOnly = true)
    public ProgressSummaryResponse getProgress(Long userId, LocalDate startDate, LocalDate endDate) {
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("endDate must not be before startDate");
        }

        UserProfile user = getUser(userId);
        List<MealRecord> records = mealRecordRepository.findByUserAndDateRange(userId, startDate, endDate);

        List<ProgressPointResponse> trend = startDate.datesUntil(endDate.plusDays(1))
                .map(date -> buildPoint(user, date, records))
                .toList();

        BigDecimal totalCalories = trend.stream()
                .map(ProgressPointResponse::consumedCalories)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal averageCalories = trend.isEmpty()
                ? BigDecimal.ZERO
                : totalCalories.divide(BigDecimal.valueOf(trend.size()), 2, RoundingMode.HALF_UP);
        BigDecimal totalGap = trend.stream()
                .map(ProgressPointResponse::calorieGap)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal averageGap = trend.isEmpty()
                ? BigDecimal.ZERO
                : totalGap.divide(BigDecimal.valueOf(trend.size()), 2, RoundingMode.HALF_UP);

        return new ProgressSummaryResponse(
                userId,
                startDate,
                endDate,
                averageCalories,
                totalCalories,
                averageGap,
                user.weightToLose(),
                trend
        );
    }

    private ProgressPointResponse buildPoint(UserProfile user, LocalDate date, List<MealRecord> records) {
        BigDecimal consumed = records.stream()
                .filter(record -> record.getRecordDate().equals(date))
                .map(MealRecord::getTotalCalories)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal gap = BigDecimal.valueOf(user.getDailyCalorieTarget()).subtract(consumed);
        return new ProgressPointResponse(date, consumed, user.getDailyCalorieTarget(), gap);
    }

    private BigDecimal sumCalories(List<MealRecord> records) {
        return records.stream()
                .map(MealRecord::getTotalCalories)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal sumNutrient(
            List<MealRecord> records,
            Map<Long, Food> foods,
            java.util.function.Function<Food, BigDecimal> nutrientGetter
    ) {
        return records.stream()
                .map(record -> {
                    Food food = foods.get(record.getFoodId());
                    return nutrientGetter.apply(food)
                            .multiply(record.getQuantityInGram())
                            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private Map<Long, Food> loadFoods(List<MealRecord> records) {
        return records.stream()
                .map(MealRecord::getFoodId)
                .distinct()
                .map(this::getFood)
                .collect(Collectors.toMap(Food::getId, food -> food));
    }

    private UserProfile getUser(Long id) {
        return userProfileRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("user not found, id=" + id));
    }

    private Food getFood(Long id) {
        return foodRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("food not found, id=" + id));
    }

    private UserResponse toResponse(UserProfile user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getGender(),
                user.getBirthDate(),
                user.calculateAge(),
                user.getHeight(),
                user.getActivityLevel(),
                user.getDailyCalorieTarget(),
                user.getCurrentWeight(),
                user.getTargetWeight(),
                user.getCustomBmr(),
                user.calculateBmi(),
                user.calculateBmr(),
                user.calculateTdee(),
                user.getCreatedAt()
        );
    }

    private MealRecordResponse toMealRecordResponse(MealRecord record, String foodName) {
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

    private String normalizeName(String name) {
        if (name == null || name.isBlank()) {
            return DEFAULT_NAME;
        }
        return name.trim();
    }
}