package com.diet.service;

import com.diet.common.ConflictException;
import com.diet.common.NotFoundException;
import com.diet.domain.exercise.Exercise;
import com.diet.domain.exercise.ExerciseRecordRepository;
import com.diet.domain.exercise.ExerciseRepository;
import com.diet.dto.exercise.CreateExerciseRequest;
import com.diet.dto.exercise.ExerciseResponse;
import com.diet.dto.exercise.UpdateExerciseRequest;
import com.diet.domain.user.UserProfileRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ExerciseService {

    public static final String SCOPE_ALL = "ALL";

    public static final String SCOPE_CUSTOM = "CUSTOM";

    private final ExerciseRepository exerciseRepository;

    private final UserProfileRepository userProfileRepository;

    private final ExerciseRecordRepository exerciseRecordRepository;

    public ExerciseService(
            ExerciseRepository exerciseRepository,
            UserProfileRepository userProfileRepository,
            ExerciseRecordRepository exerciseRecordRepository
    ) {
        this.exerciseRepository = exerciseRepository;
        this.userProfileRepository = userProfileRepository;
        this.exerciseRecordRepository = exerciseRecordRepository;
    }

    public ExerciseResponse create(Long userId, CreateExerciseRequest request) {
        ensureUserExists(userId);
        String normalizedName = request.name().trim();
        if (exerciseRepository.findByAccessibleNameIgnoreCase(userId, normalizedName).isPresent()) {
            throw new ConflictException("exercise already exists: " + request.name());
        }

        Exercise exercise = new Exercise(
                userId,
                normalizedName,
                request.metValue(),
                request.category()
        );
        exerciseRepository.save(exercise);
        return toResponse(exercise);
    }

    public ExerciseResponse update(Long userId, Long exerciseId, UpdateExerciseRequest request) {
        ensureUserExists(userId);
        Exercise exercise = getOwnedCustomExercise(userId, exerciseId);
        String normalizedName = request.name().trim();
        exerciseRepository.findByAccessibleNameIgnoreCase(userId, normalizedName)
                .filter(existing -> !existing.getId().equals(exerciseId))
                .ifPresent(existing -> {
                    throw new ConflictException("exercise already exists: " + normalizedName);
                });

        exercise.setName(normalizedName);
        exercise.setMetValue(request.metValue());
        exercise.setCategory(request.category());
        exerciseRepository.save(exercise);
        return toResponse(exercise);
    }

    public boolean delete(Long userId, Long exerciseId) {
        ensureUserExists(userId);
        Exercise exercise = getOwnedCustomExercise(userId, exerciseId);
        ensureExerciseCanBeDeleted(exercise);
        exerciseRepository.deleteById(exercise.getId());
        return true;
    }

    @Transactional(readOnly = true)
    public List<ExerciseResponse> findAll(Long userId, String keyword, String category, String scope) {
        List<Exercise> exercises = SCOPE_CUSTOM.equals(scope)
                ? exerciseRepository.findCustomByUser(userId, keyword, category)
                : exerciseRepository.findAll(userId, keyword, category);
        return exercises
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ExerciseResponse> findCustomByUser(Long userId, String keyword, String category) {
        ensureUserExists(userId);
        return exerciseRepository.findCustomByUser(userId, keyword, category)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Exercise findEntity(Long exerciseId) {
        return exerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new NotFoundException("exercise not found, id=" + exerciseId));
    }

    @Transactional(readOnly = true)
    public Exercise findAccessibleEntity(Long userId, Long exerciseId) {
        return exerciseRepository.findAccessibleById(userId, exerciseId)
                .orElseThrow(() -> new NotFoundException("exercise not found, id=" + exerciseId));
    }

    private Exercise getOwnedCustomExercise(Long userId, Long exerciseId) {
        return exerciseRepository.findOwnedCustomById(userId, exerciseId)
                .orElseThrow(() -> new NotFoundException("exercise not found, id=" + exerciseId));
    }

    private void ensureUserExists(Long userId) {
        userProfileRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("user not found, id=" + userId));
    }

    private void ensureExerciseCanBeDeleted(Exercise exercise) {
        if (exerciseRecordRepository.countByExerciseId(exercise.getId()) > 0) {
            throw new ConflictException("该运动已被运动记录使用，无法删除");
        }
    }

    private ExerciseResponse toResponse(Exercise exercise) {
        return new ExerciseResponse(
                exercise.getId(),
                exercise.getUserId(),
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
