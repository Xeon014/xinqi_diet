package com.diet.repository;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
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
    public Optional<Food> findById(Long id) {
        return Optional.ofNullable(foodMapper.selectById(id));
    }

    @Override
    public Optional<Food> findByNameIgnoreCase(String name) {
        return Optional.ofNullable(foodMapper.findByNameIgnoreCase(name));
    }

    @Override
    public List<Food> findAll(String keyword) {
        LambdaQueryWrapper<Food> queryWrapper = new LambdaQueryWrapper<Food>()
                .orderByAsc(Food::getName);
        if (keyword != null && !keyword.isBlank()) {
            queryWrapper.like(Food::getName, keyword.trim());
        }
        return foodMapper.selectList(queryWrapper);
    }
}
