package com.diet.food;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.diet.common.ConflictException;
import com.diet.common.NotFoundException;
import com.diet.food.dto.CreateFoodRequest;
import com.diet.food.dto.FoodResponse;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class FoodService {

    private final FoodRepository foodRepository;

    public FoodService(FoodRepository foodRepository) {
        this.foodRepository = foodRepository;
    }

    public FoodResponse create(CreateFoodRequest request) {
        if (foodRepository.findByNameIgnoreCase(request.name()) != null) {
            throw new ConflictException("food already exists: " + request.name());
        }

        Food food = new Food(
                request.name(),
                request.caloriesPer100g(),
                request.proteinPer100g(),
                request.carbsPer100g(),
                request.fatPer100g(),
                request.category()
        );
        foodRepository.insert(food);
        return toResponse(food);
    }

    @Transactional(readOnly = true)
    public List<FoodResponse> findAll(String keyword) {
        LambdaQueryWrapper<Food> queryWrapper = new LambdaQueryWrapper<Food>()
                .orderByAsc(Food::getName);
        if (keyword != null && !keyword.isBlank()) {
            queryWrapper.like(Food::getName, keyword.trim());
        }
        return foodRepository.selectList(queryWrapper)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Food findEntity(Long id) {
        Food food = foodRepository.selectById(id);
        if (food == null) {
            throw new NotFoundException("food not found, id=" + id);
        }
        return food;
    }

    private FoodResponse toResponse(Food food) {
        return new FoodResponse(
                food.getId(),
                food.getName(),
                food.getCaloriesPer100g(),
                food.getProteinPer100g(),
                food.getCarbsPer100g(),
                food.getFatPer100g(),
                food.getCategory(),
                food.getCreatedAt()
        );
    }
}