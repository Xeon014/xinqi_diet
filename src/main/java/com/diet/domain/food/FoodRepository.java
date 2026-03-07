package com.diet.domain.food;

import java.util.List;
import java.util.Optional;

public interface FoodRepository {

    long count();

    void save(Food food);

    Optional<Food> findById(Long id);

    Optional<Food> findByNameIgnoreCase(String name);

    List<Food> findAll(String keyword);
}
