package com.diet.repository;

import com.diet.domain.food.Food;
import com.diet.domain.food.FoodRepository;
import com.diet.mapper.FoodMapper;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class FoodRepositoryImpl implements FoodRepository {

    private final FoodMapper foodMapper;

    public FoodRepositoryImpl(FoodMapper foodMapper) {
        this.foodMapper = foodMapper;
    }

    @Override
    public long count() {
        return foodMapper.selectCount(null);
    }

    @Override
    public void save(Food food) {
        if (food.getId() == null) {
            foodMapper.insert(food);
            return;
        }
        foodMapper.updateById(food);
    }

    @Override
    public void deleteById(Long id) {
        foodMapper.deleteById(id);
    }

    @Override
    public Optional<Food> findById(Long id) {
        return Optional.ofNullable(foodMapper.selectById(id));
    }

    @Override
    public Optional<Food> findAccessibleById(Long userId, Long id) {
        return Optional.ofNullable(foodMapper.findAccessibleById(userId, id));
    }

    @Override
    public Optional<Food> findOwnedCustomById(Long userId, Long id) {
        return Optional.ofNullable(foodMapper.findOwnedCustomById(userId, id));
    }

    @Override
    public Optional<Food> findByAccessibleNameIgnoreCase(Long userId, String name) {
        return Optional.ofNullable(foodMapper.findByAccessibleNameIgnoreCase(userId, name));
    }

    @Override
    public List<Food> findAll(Long userId, String keyword) {
        return foodMapper.findAll(userId, keyword);
    }

    @Override
    public List<Food> findCustomByUser(Long userId, String keyword) {
        return foodMapper.findCustomByUser(userId, keyword);
    }
}
