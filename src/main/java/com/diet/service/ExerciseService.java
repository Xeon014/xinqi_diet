package com.diet.service;

import com.diet.domain.exercise.Exercise;
import com.diet.domain.exercise.ExerciseRepository;
import com.diet.dto.exercise.ExerciseResponse;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ExerciseService {

    private final ExerciseRepository exerciseRepository;

    public ExerciseService(ExerciseRepository exerciseRepository) {
        this.exerciseRepository = exerciseRepository;
    }

    public List<ExerciseResponse> findAll(String keyword, String category) {
        return exerciseRepository.findAll(keyword, category)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public Exercise findEntity(Long exerciseId) {
        return exerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new IllegalArgumentException("exercise not found, id=" + exerciseId));
    }

    private ExerciseResponse toResponse(Exercise exercise) {
        return new ExerciseResponse(
                exercise.getId(),
                exercise.getName(),
                exercise.getMetValue(),
                exercise.getCategory(),
                exercise.getSource(),
                exercise.getSourceRef(),
                exercise.getAliases(),
                exercise.getBuiltin(),
                exercise.getCreatedAt()
        );
    }
}