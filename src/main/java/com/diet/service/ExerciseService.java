package com.diet.service;

import com.diet.common.ConflictException;
import com.diet.domain.exercise.Exercise;
import com.diet.domain.exercise.ExerciseRepository;
import com.diet.dto.exercise.CreateExerciseRequest;
import com.diet.dto.exercise.ExerciseResponse;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ExerciseService {

    private final ExerciseRepository exerciseRepository;

    public ExerciseService(ExerciseRepository exerciseRepository) {
        this.exerciseRepository = exerciseRepository;
    }

    public ExerciseResponse create(CreateExerciseRequest request) {
        if (exerciseRepository.findByNameIgnoreCase(request.name()).isPresent()) {
            throw new ConflictException("exercise already exists: " + request.name());
        }

        Exercise exercise = new Exercise(
                request.name(),
                request.metValue(),
                request.category()
        );
        exerciseRepository.save(exercise);
        return toResponse(exercise);
    }

    @Transactional(readOnly = true)
    public List<ExerciseResponse> findAll(String keyword, String category) {
        return exerciseRepository.findAll(keyword, category)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
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
