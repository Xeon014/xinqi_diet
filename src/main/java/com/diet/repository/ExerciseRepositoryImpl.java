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
    public void deleteById(Long id) {
        exerciseMapper.deleteById(id);
    }

    @Override
    public Optional<Exercise> findById(Long id) {
        return Optional.ofNullable(exerciseMapper.selectById(id));
    }

    @Override
    public Optional<Exercise> findAccessibleById(Long userId, Long id) {
        return Optional.ofNullable(exerciseMapper.findAccessibleById(userId, id));
    }

    @Override
    public Optional<Exercise> findOwnedCustomById(Long userId, Long id) {
        return Optional.ofNullable(exerciseMapper.findOwnedCustomById(userId, id));
    }

    @Override
    public Optional<Exercise> findByAccessibleNameIgnoreCase(Long userId, String name) {
        return Optional.ofNullable(exerciseMapper.findByAccessibleNameIgnoreCase(userId, name));
    }

    @Override
    public List<Exercise> findAll(Long userId, String keyword, String category) {
        return exerciseMapper.findAll(userId, keyword, category);
    }

    @Override
    public List<Exercise> findCustomByUser(Long userId, String keyword, String category) {
        return exerciseMapper.findCustomByUser(userId, keyword, category);
    }
}
