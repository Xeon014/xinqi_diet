package com.diet.service;

import com.diet.common.ConflictException;
import com.diet.common.NotFoundException;
import com.diet.domain.combo.MealComboRepository;
import com.diet.domain.food.Food;
import com.diet.domain.food.FoodRepository;
import com.diet.domain.record.MealRecordRepository;
import com.diet.dto.food.CreateFoodRequest;
import com.diet.dto.food.FoodResponse;
import com.diet.dto.food.UpdateFoodRequest;
import com.diet.domain.user.UserProfileRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class FoodService {

    public static final String SCOPE_ALL = "ALL";

    public static final String SCOPE_CUSTOM = "CUSTOM";

    private final FoodRepository foodRepository;

    private final UserProfileRepository userProfileRepository;

    private final MealRecordRepository mealRecordRepository;

    private final MealComboRepository mealComboRepository;

    public FoodService(
            FoodRepository foodRepository,
            UserProfileRepository userProfileRepository,
            MealRecordRepository mealRecordRepository,
            MealComboRepository mealComboRepository
    ) {
        this.foodRepository = foodRepository;
        this.userProfileRepository = userProfileRepository;
        this.mealRecordRepository = mealRecordRepository;
        this.mealComboRepository = mealComboRepository;
    }

    public FoodResponse create(Long userId, CreateFoodRequest request) {
        ensureUserExists(userId);
        String normalizedName = request.name().trim();
        if (foodRepository.findByAccessibleNameIgnoreCase(userId, normalizedName).isPresent()) {
            throw new ConflictException("food already exists: " + request.name());
        }

        Food food = new Food(
                userId,
                normalizedName,
                request.caloriesPer100g(),
                request.proteinPer100g(),
                request.carbsPer100g(),
                request.fatPer100g(),
                request.category()
        );
        foodRepository.save(food);
        return toResponse(food);
    }

    public FoodResponse update(Long userId, Long foodId, UpdateFoodRequest request) {
        ensureUserExists(userId);
        Food food = getOwnedCustomFood(userId, foodId);
        String normalizedName = request.name().trim();
        foodRepository.findByAccessibleNameIgnoreCase(userId, normalizedName)
                .filter(existing -> !existing.getId().equals(foodId))
                .ifPresent(existing -> {
                    throw new ConflictException("food already exists: " + normalizedName);
                });

        food.setName(normalizedName);
        food.setCaloriesPer100g(request.caloriesPer100g());
        food.setProteinPer100g(request.proteinPer100g());
        food.setCarbsPer100g(request.carbsPer100g());
        food.setFatPer100g(request.fatPer100g());
        food.setCategory(request.category());
        foodRepository.save(food);
        return toResponse(food);
    }

    public boolean delete(Long userId, Long foodId) {
        ensureUserExists(userId);
        Food food = getOwnedCustomFood(userId, foodId);
        ensureFoodCanBeDeleted(food);
        foodRepository.deleteById(food.getId());
        return true;
    }

    @Transactional(readOnly = true)
    public List<FoodResponse> findAll(Long userId, String keyword, String scope) {
        List<Food> foods = SCOPE_CUSTOM.equals(scope)
                ? foodRepository.findCustomByUser(userId, keyword)
                : foodRepository.findAll(userId, keyword);
        return foods
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FoodResponse> findCustomByUser(Long userId, String keyword) {
        ensureUserExists(userId);
        return foodRepository.findCustomByUser(userId, keyword)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Food findEntity(Long id) {
        return foodRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("food not found, id=" + id));
    }

    @Transactional(readOnly = true)
    public Food findAccessibleEntity(Long userId, Long id) {
        return foodRepository.findAccessibleById(userId, id)
                .orElseThrow(() -> new NotFoundException("food not found, id=" + id));
    }

    private Food getOwnedCustomFood(Long userId, Long foodId) {
        return foodRepository.findOwnedCustomById(userId, foodId)
                .orElseThrow(() -> new NotFoundException("food not found, id=" + foodId));
    }

    private void ensureUserExists(Long userId) {
        userProfileRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("user not found, id=" + userId));
    }

    private void ensureFoodCanBeDeleted(Food food) {
        if (mealRecordRepository.countByFoodId(food.getId()) > 0) {
            throw new ConflictException("该食物已被饮食记录使用，无法删除");
        }
        if (mealComboRepository.countItemsByFoodId(food.getId()) > 0) {
            throw new ConflictException("该食物已被套餐使用，无法删除");
        }
    }

    private FoodResponse toResponse(Food food) {
        return new FoodResponse(
                food.getId(),
                food.getUserId(),
                food.getName(),
                food.getCaloriesPer100g(),
                food.getProteinPer100g(),
                food.getCarbsPer100g(),
                food.getFatPer100g(),
                food.getCategory(),
                food.getSource(),
                food.getSourceRef(),
                food.getAliases(),
                food.getBuiltin(),
                food.getCreatedAt()
        );
    }
}
