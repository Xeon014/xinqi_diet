package com.diet.service;

import com.diet.common.ConflictException;
import com.diet.common.NotFoundException;
import com.diet.domain.combo.MealComboRepository;
import com.diet.domain.food.Food;
import com.diet.domain.food.FoodCalorieUnit;
import com.diet.domain.food.FoodQuantityUnit;
import com.diet.domain.food.FoodRepository;
import com.diet.domain.record.MealRecordRepository;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.food.CreateFoodRequest;
import com.diet.dto.food.FoodListResponse;
import com.diet.dto.food.FoodResponse;
import com.diet.dto.food.UpdateFoodRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class FoodService {

    public static final String SCOPE_ALL = "ALL";

    public static final String SCOPE_CUSTOM = "CUSTOM";

    private static final BigDecimal KJ_PER_KCAL = new BigDecimal("4.184");

    private static final int DEFAULT_PAGE = 1;

    private static final int DEFAULT_PAGE_SIZE = 50;

    private static final int MAX_PAGE_SIZE = 100;

    private static final Map<String, String> CATEGORY_LABEL_MAP = buildCategoryLabelMap();

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
        FoodCalorieUnit calorieUnit = resolveCalorieUnit(request.calorieUnit());
        FoodQuantityUnit quantityUnit = resolveQuantityUnit(request.quantityUnit());

        Food food = new Food(
                userId,
                normalizedName,
                normalizeCaloriesPer100(request.caloriesPer100g(), calorieUnit),
                request.proteinPer100g(),
                request.carbsPer100g(),
                request.fatPer100g(),
                request.category()
        );
        food.setCalorieUnit(calorieUnit);
        food.setQuantityUnit(quantityUnit);
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
        FoodCalorieUnit calorieUnit = request.calorieUnit() == null
                ? resolveCalorieUnit(food.getCalorieUnit())
                : resolveCalorieUnit(request.calorieUnit());
        FoodQuantityUnit quantityUnit = request.quantityUnit() == null
                ? resolveQuantityUnit(food.getQuantityUnit())
                : resolveQuantityUnit(request.quantityUnit());

        food.setName(normalizedName);
        food.setCaloriesPer100g(normalizeCaloriesPer100(request.caloriesPer100g(), calorieUnit));
        food.setProteinPer100g(request.proteinPer100g());
        food.setCarbsPer100g(request.carbsPer100g());
        food.setFatPer100g(request.fatPer100g());
        food.setCategory(request.category());
        food.setCalorieUnit(calorieUnit);
        food.setQuantityUnit(quantityUnit);
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
    public FoodListResponse findAll(Long userId, String keyword, String category, int page, int size, String scope) {
        int normalizedPage = normalizePage(page);
        int normalizedSize = normalizePageSize(size);
        String normalizedKeyword = normalizeKeyword(keyword);
        String normalizedCategory = normalizeCategory(category);
        boolean customOnly = SCOPE_CUSTOM.equals(scope);
        boolean builtinOnly = !customOnly && normalizedCategory != null && normalizedKeyword == null;
        int offset = (normalizedPage - 1) * normalizedSize;

        List<FoodResponse> foods = foodRepository.findPage(
                        userId,
                        normalizedKeyword,
                        normalizedCategory,
                        customOnly,
                        builtinOnly,
                        offset,
                        normalizedSize
                ).stream()
                .map(this::toResponse)
                .toList();
        long total = foodRepository.countPage(userId, normalizedKeyword, normalizedCategory, customOnly, builtinOnly);
        return new FoodListResponse(foods, normalizedPage, normalizedSize, total);
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
        FoodCalorieUnit calorieUnit = resolveCalorieUnit(food.getCalorieUnit());
        FoodQuantityUnit quantityUnit = resolveQuantityUnit(food.getQuantityUnit());
        return new FoodResponse(
                food.getId(),
                food.getUserId(),
                food.getName(),
                food.getCaloriesPer100g(),
                toDisplayCaloriesPer100(food.getCaloriesPer100g(), calorieUnit),
                calorieUnit,
                food.getProteinPer100g(),
                food.getCarbsPer100g(),
                food.getFatPer100g(),
                quantityUnit,
                food.getCategory(),
                food.getSource(),
                food.getSourceRef(),
                food.getAliases(),
                food.getImageUrl(),
                food.getBuiltin(),
                food.getCreatedAt()
        );
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null) {
            return null;
        }
        String trimmed = keyword.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeCategory(String category) {
        if (category == null) {
            return null;
        }
        String trimmed = category.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        String upperCase = trimmed.toUpperCase();
        if ("ALL".equals(upperCase)) {
            return null;
        }
        return CATEGORY_LABEL_MAP.getOrDefault(upperCase, trimmed);
    }

    private int normalizePage(int page) {
        return Math.max(page, DEFAULT_PAGE);
    }

    private int normalizePageSize(int size) {
        if (size <= 0) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private FoodCalorieUnit resolveCalorieUnit(FoodCalorieUnit calorieUnit) {
        return calorieUnit == null ? FoodCalorieUnit.KCAL : calorieUnit;
    }

    private FoodQuantityUnit resolveQuantityUnit(FoodQuantityUnit quantityUnit) {
        return quantityUnit == null ? FoodQuantityUnit.G : quantityUnit;
    }

    private BigDecimal normalizeCaloriesPer100(BigDecimal rawValue, FoodCalorieUnit calorieUnit) {
        FoodCalorieUnit resolvedUnit = resolveCalorieUnit(calorieUnit);
        if (resolvedUnit == FoodCalorieUnit.KJ) {
            return rawValue.divide(KJ_PER_KCAL, 2, RoundingMode.HALF_UP);
        }
        return rawValue.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal toDisplayCaloriesPer100(BigDecimal caloriesPer100Kcal, FoodCalorieUnit calorieUnit) {
        if (calorieUnit == FoodCalorieUnit.KJ) {
            return caloriesPer100Kcal.multiply(KJ_PER_KCAL).setScale(2, RoundingMode.HALF_UP);
        }
        return caloriesPer100Kcal.setScale(2, RoundingMode.HALF_UP);
    }

    private static Map<String, String> buildCategoryLabelMap() {
        Map<String, String> mapping = new LinkedHashMap<>();
        mapping.put("STAPLE", "主食");
        mapping.put("PROTEIN", "肉蛋奶");
        mapping.put("VEGETABLE_FRUIT", "蔬果");
        mapping.put("BEAN", "豆制品");
        mapping.put("DRINK", "饮品");
        mapping.put("SNACK", "零食");
        mapping.put("OTHER", "其他");
        return mapping;
    }
}
