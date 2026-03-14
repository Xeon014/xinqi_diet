package com.diet.service;

import com.diet.common.NotFoundException;
import com.diet.domain.combo.MealCombo;
import com.diet.domain.combo.MealComboItem;
import com.diet.domain.combo.MealComboRepository;
import com.diet.domain.food.Food;
import com.diet.domain.food.FoodRepository;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.combo.CreateMealComboItemRequest;
import com.diet.dto.combo.CreateMealComboRequest;
import com.diet.dto.combo.MealComboItemResponse;
import com.diet.dto.combo.MealComboResponse;
import com.diet.dto.combo.UpdateMealComboRequest;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class MealComboService {

    private final MealComboRepository mealComboRepository;

    private final UserProfileRepository userProfileRepository;

    private final FoodRepository foodRepository;

    public MealComboService(
            MealComboRepository mealComboRepository,
            UserProfileRepository userProfileRepository,
            FoodRepository foodRepository
    ) {
        this.mealComboRepository = mealComboRepository;
        this.userProfileRepository = userProfileRepository;
        this.foodRepository = foodRepository;
    }

    public MealComboResponse create(Long userId, CreateMealComboRequest request) {
        ensureUserExists(userId);
        MealCombo combo = new MealCombo(userId, request.name().trim(), request.description());
        combo.setUpdatedAt(LocalDateTime.now());
        mealComboRepository.save(combo);

        List<MealComboItem> comboItems = buildItems(userId, combo.getId(), request.items());
        mealComboRepository.saveItems(comboItems);

        return toResponse(combo, comboItems);
    }

    public MealComboResponse update(Long userId, Long comboId, UpdateMealComboRequest request) {
        ensureUserExists(userId);
        MealCombo combo = getOwnedCombo(userId, comboId);
        combo.setName(request.name().trim());
        combo.setDescription(request.description());
        combo.setUpdatedAt(LocalDateTime.now());
        mealComboRepository.save(combo);

        mealComboRepository.deleteItemsByComboId(combo.getId());
        List<MealComboItem> comboItems = buildItems(userId, combo.getId(), request.items());
        mealComboRepository.saveItems(comboItems);

        return toResponse(combo, comboItems);
    }

    public boolean delete(Long userId, Long comboId) {
        ensureUserExists(userId);
        MealCombo combo = getOwnedCombo(userId, comboId);
        mealComboRepository.deleteItemsByComboId(combo.getId());
        mealComboRepository.deleteById(combo.getId());
        return true;
    }

    @Transactional(readOnly = true)
    public List<MealComboResponse> findByUser(Long userId) {
        ensureUserExists(userId);
        return mealComboRepository.findByUserId(userId)
                .stream()
                .map(combo -> toResponse(combo, mealComboRepository.findItemsByComboId(combo.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public MealComboResponse findById(Long userId, Long comboId) {
        ensureUserExists(userId);
        MealCombo combo = getOwnedCombo(userId, comboId);
        return toResponse(combo, mealComboRepository.findItemsByComboId(combo.getId()));
    }

    private List<MealComboItem> buildItems(Long userId, Long comboId, List<CreateMealComboItemRequest> requestItems) {
        List<MealComboItem> comboItems = new ArrayList<>();
        for (int i = 0; i < requestItems.size(); i++) {
            CreateMealComboItemRequest requestItem = requestItems.get(i);
            getAccessibleFood(userId, requestItem.foodId());
            comboItems.add(new MealComboItem(
                    comboId,
                    requestItem.foodId(),
                    requestItem.quantityInGram(),
                    i
            ));
        }
        return comboItems;
    }

    private MealComboResponse toResponse(MealCombo combo, List<MealComboItem> items) {
        Map<Long, Food> foods = loadFoods(items);
        List<MealComboItemResponse> responses = items.stream()
                .map(item -> {
                    Food food = foods.get(item.getFoodId());
                    return new MealComboItemResponse(
                            item.getFoodId(),
                            food.getName(),
                            food.getCaloriesPer100g(),
                            food.getProteinPer100g(),
                            food.getCarbsPer100g(),
                            food.getFatPer100g(),
                            item.getQuantityInGram()
                    );
                })
                .toList();

        return new MealComboResponse(
                combo.getId(),
                combo.getUserId(),
                combo.getName(),
                combo.getDescription(),
                responses,
                combo.getCreatedAt()
        );
    }

    private Map<Long, Food> loadFoods(List<MealComboItem> items) {
        LinkedHashMap<Long, Food> foods = new LinkedHashMap<>();
        for (MealComboItem item : items) {
            foods.put(item.getFoodId(), getFood(item.getFoodId()));
        }
        return foods;
    }

    private MealCombo getOwnedCombo(Long userId, Long comboId) {
        MealCombo combo = mealComboRepository.findById(comboId)
                .orElseThrow(() -> new NotFoundException("meal combo not found, id=" + comboId));
        if (!combo.getUserId().equals(userId)) {
            throw new NotFoundException("meal combo not found, id=" + comboId);
        }
        return combo;
    }

    private void ensureUserExists(Long userId) {
        userProfileRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("user not found, id=" + userId));
    }

    private Food getFood(Long foodId) {
        return foodRepository.findById(foodId)
                .orElseThrow(() -> new NotFoundException("food not found, id=" + foodId));
    }

    private Food getAccessibleFood(Long userId, Long foodId) {
        return foodRepository.findAccessibleById(userId, foodId)
                .orElseThrow(() -> new NotFoundException("food not found, id=" + foodId));
    }
}
