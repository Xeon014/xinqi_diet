package com.diet.repository;

import com.diet.domain.exercise.Exercise;
import com.diet.domain.exercise.ExerciseRepository;
import com.diet.mapper.ExerciseMapper;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class ExerciseRepositoryImpl implements ExerciseRepository {

    private final ExerciseMapper exerciseMapper;

    public ExerciseRepositoryImpl(ExerciseMapper exerciseMapper) {
        this.exerciseMapper = exerciseMapper;
    }

    @Override
    public long count() {
        return exerciseMapper.selectCount(null);
    }

    @Override
    public void save(Exercise exercise) {
        if (exercise.getId() == null) {
            exerciseMapper.insert(exercise);
            return;
        }
        exerciseMapper.updateById(exercise);
    }

    @Override
    public Optional<Exercise> findById(Long id) {
        return Optional.ofNullable(exerciseMapper.selectById(id));
    }

    @Override
    public Optional<Exercise> findByNameIgnoreCase(String name) {
        return Optional.ofNullable(exerciseMapper.findByNameIgnoreCase(name));
    }

    @Override
    public List<Exercise> findAll(String keyword, String category) {
        return exerciseMapper.findAll(keyword, category);
    }
}