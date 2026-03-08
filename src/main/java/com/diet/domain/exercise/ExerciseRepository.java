package com.diet.domain.exercise;

import java.util.List;
import java.util.Optional;

public interface ExerciseRepository {

    long count();

    void save(Exercise exercise);

    Optional<Exercise> findById(Long id);

    Optional<Exercise> findByNameIgnoreCase(String name);

    List<Exercise> findAll(String keyword, String category);
}