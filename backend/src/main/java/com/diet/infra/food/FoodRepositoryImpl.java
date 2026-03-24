package com.diet.infra.food;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.diet.domain.food.Food;
import com.diet.domain.food.FoodRepository;
import com.diet.infra.food.FoodMapper;
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
    public long countBuiltin() {
        return foodMapper.selectCount(new LambdaQueryWrapper<Food>()
                .eq(Food::getBuiltin, true));
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

    @Override
    public List<Food> findPage(Long userId, String keyword, String category, boolean customOnly, boolean builtinOnly, int offset, int size) {
        return foodMapper.findPage(userId, keyword, category, customOnly, builtinOnly, offset, size);
    }

    @Override
    public long countPage(Long userId, String keyword, String category, boolean customOnly, boolean builtinOnly) {
        return foodMapper.countPage(userId, keyword, category, customOnly, builtinOnly);
    }
}
