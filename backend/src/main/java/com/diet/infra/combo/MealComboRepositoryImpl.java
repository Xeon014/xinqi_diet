package com.diet.infra.combo;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.diet.domain.combo.MealCombo;
import com.diet.domain.combo.MealComboItem;
import com.diet.domain.combo.MealComboRepository;
import com.diet.infra.combo.MealComboItemMapper;
import com.diet.infra.combo.MealComboMapper;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class MealComboRepositoryImpl implements MealComboRepository {

    private final MealComboMapper mealComboMapper;

    private final MealComboItemMapper mealComboItemMapper;

    public MealComboRepositoryImpl(MealComboMapper mealComboMapper, MealComboItemMapper mealComboItemMapper) {
        this.mealComboMapper = mealComboMapper;
        this.mealComboItemMapper = mealComboItemMapper;
    }

    @Override
    public void save(MealCombo combo) {
        if (combo.getId() == null) {
            mealComboMapper.insert(combo);
            return;
        }
        mealComboMapper.updateById(combo);
    }

    @Override
    public Optional<MealCombo> findById(Long id) {
        return Optional.ofNullable(mealComboMapper.selectById(id));
    }

    @Override
    public List<MealCombo> findByUserId(Long userId) {
        return mealComboMapper.selectList(new LambdaQueryWrapper<MealCombo>()
                .eq(MealCombo::getUserId, userId)
                .orderByDesc(MealCombo::getCreatedAt)
                .orderByDesc(MealCombo::getId));
    }

    @Override
    public void saveItems(List<MealComboItem> items) {
        for (MealComboItem item : items) {
            mealComboItemMapper.insert(item);
        }
    }

    @Override
    public List<MealComboItem> findItemsByComboId(Long comboId) {
        return mealComboItemMapper.selectList(new LambdaQueryWrapper<MealComboItem>()
                .eq(MealComboItem::getComboId, comboId)
                .orderByAsc(MealComboItem::getSortOrder)
                .orderByAsc(MealComboItem::getId));
    }

    @Override
    public void deleteItemsByComboId(Long comboId) {
        mealComboItemMapper.delete(new LambdaQueryWrapper<MealComboItem>()
                .eq(MealComboItem::getComboId, comboId));
    }

    @Override
    public long countItemsByFoodId(Long foodId) {
        return mealComboItemMapper.selectCount(new LambdaQueryWrapper<MealComboItem>()
                .eq(MealComboItem::getFoodId, foodId));
    }

    @Override
    public void deleteById(Long comboId) {
        mealComboMapper.deleteById(comboId);
    }
}
