package com.diet.domain.food;

import java.util.List;
import java.util.Optional;

public interface FoodRepository {

    long count();

    long countBuiltin();

    void save(Food food);

    void deleteById(Long id);

    Optional<Food> findById(Long id);

    Optional<Food> findAccessibleById(Long userId, Long id);

    Optional<Food> findOwnedCustomById(Long userId, Long id);

    Optional<Food> findByAccessibleNameIgnoreCase(Long userId, String name);

    List<Food> findAll(Long userId, String keyword);

    List<Food> findCustomByUser(Long userId, String keyword);

    List<Food> findPage(Long userId, String keyword, String category, boolean customOnly, boolean builtinOnly, int offset, int size);

    long countPage(Long userId, String keyword, String category, boolean customOnly, boolean builtinOnly);
}
