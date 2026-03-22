package com.diet.domain.combo;

import java.util.List;
import java.util.Optional;

public interface MealComboRepository {

    void save(MealCombo combo);

    Optional<MealCombo> findById(Long id);

    List<MealCombo> findByUserId(Long userId);

    void saveItems(List<MealComboItem> items);

    List<MealComboItem> findItemsByComboId(Long comboId);

    void deleteItemsByComboId(Long comboId);

    long countItemsByFoodId(Long foodId);

    void deleteById(Long comboId);
}
