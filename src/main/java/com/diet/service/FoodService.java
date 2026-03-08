package com.diet.service;

import com.diet.common.ConflictException;
import com.diet.common.NotFoundException;
import com.diet.domain.food.Food;
import com.diet.domain.food.FoodRepository;
import com.diet.dto.food.CreateFoodRequest;
import com.diet.dto.food.FoodResponse;
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
        if (foodRepository.findByNameIgnoreCase(request.name()).isPresent()) {
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
        foodRepository.save(food);
        return toResponse(food);
    }

    @Transactional(readOnly = true)
    public List<FoodResponse> findAll(String keyword) {
        return foodRepository.findAll(keyword)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Food findEntity(Long id) {
        return foodRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("food not found, id=" + id));
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
                food.getSource(),
                food.getSourceRef(),
                food.getAliases(),
                food.getBuiltin(),
                food.getCreatedAt()
        );
    }
}
