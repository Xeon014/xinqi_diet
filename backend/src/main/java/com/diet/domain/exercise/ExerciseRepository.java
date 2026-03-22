package com.diet.domain.exercise;

import java.util.List;
import java.util.Optional;

public interface ExerciseRepository {

    long count();

    void save(Exercise exercise);

    void deleteById(Long id);

    Optional<Exercise> findById(Long id);

    Optional<Exercise> findAccessibleById(Long userId, Long id);

    Optional<Exercise> findOwnedCustomById(Long userId, Long id);

    Optional<Exercise> findByAccessibleNameIgnoreCase(Long userId, String name);

    List<Exercise> findAll(Long userId, String keyword, String category);

    List<Exercise> findCustomByUser(Long userId, String keyword, String category);
}
