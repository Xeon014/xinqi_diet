package com.diet.app.record.exercise;

import com.diet.types.common.NotFoundException;
import com.diet.domain.exercise.Exercise;
import com.diet.domain.exercise.ExerciseIntensity;
import com.diet.domain.exercise.ExerciseRecord;
import com.diet.domain.exercise.ExerciseRecordRepository;
import com.diet.domain.exercise.ExerciseRepository;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.api.exercise.ExerciseRecordResponse;
import java.math.BigDecimal;
import org.springframework.stereotype.Component;

@Component
class ExerciseRecordSupport {

    private static final BigDecimal ESTIMATED_WEIGHT_KG = new BigDecimal("60.00");

    private final ExerciseRecordRepository exerciseRecordRepository;

    private final UserProfileRepository userProfileRepository;

    private final ExerciseRepository exerciseRepository;

    ExerciseRecordSupport(
            ExerciseRecordRepository exerciseRecordRepository,
            UserProfileRepository userProfileRepository,
            ExerciseRepository exerciseRepository
    ) {
        this.exerciseRecordRepository = exerciseRecordRepository;
        this.userProfileRepository = userProfileRepository;
        this.exerciseRepository = exerciseRepository;
    }

    ExerciseRecordResponse toResponse(ExerciseRecord record, Exercise exercise) {
        return new ExerciseRecordResponse(
                record.getId(),
                record.getUserId(),
                record.getExerciseId(),
                exercise.getName(),
                exercise.getMetValue(),
                exercise.getCategory(),
                record.getDurationMinutes(),
                record.getIntensityLevel(),
                record.getIntensityFactor(),
                record.getWeightKgSnapshot(),
                record.getTotalCalories(),
                record.getRecordDate(),
                record.getCreatedAt()
        );
    }

    ExerciseRecord getOwnedRecord(Long userId, Long recordId) {
        ExerciseRecord record = exerciseRecordRepository.findById(recordId)
                .orElseThrow(() -> new NotFoundException("exercise record not found, id=" + recordId));
        if (!record.getUserId().equals(userId)) {
            throw new NotFoundException("exercise record not found, id=" + recordId);
        }
        return record;
    }

    UserProfile getUser(Long userId) {
        return userProfileRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("user not found, id=" + userId));
    }

    Exercise getExercise(Long exerciseId) {
        return exerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new NotFoundException("exercise not found, id=" + exerciseId));
    }

    Exercise getAccessibleExercise(Long userId, Long exerciseId) {
        return exerciseRepository.findAccessibleById(userId, exerciseId)
                .orElseThrow(() -> new NotFoundException("exercise not found, id=" + exerciseId));
    }

    ExerciseIntensity normalizeIntensity(ExerciseIntensity intensityLevel) {
        return intensityLevel == null ? ExerciseIntensity.MEDIUM : intensityLevel;
    }

    BigDecimal resolveWeightForCalculation(UserProfile user) {
        if (user.getCurrentWeight() != null && user.getCurrentWeight().compareTo(BigDecimal.ZERO) > 0) {
            return user.getCurrentWeight();
        }
        return ESTIMATED_WEIGHT_KG;
    }
}
