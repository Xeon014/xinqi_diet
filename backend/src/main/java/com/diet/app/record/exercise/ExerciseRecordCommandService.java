package com.diet.app.record.exercise;

import com.diet.domain.exercise.Exercise;
import com.diet.domain.exercise.ExerciseIntensity;
import com.diet.domain.exercise.ExerciseRecord;
import com.diet.domain.exercise.ExerciseRecordRepository;
import com.diet.domain.user.UserProfile;
import com.diet.api.exercise.CreateExerciseRecordRequest;
import com.diet.api.exercise.ExerciseRecordResponse;
import com.diet.api.exercise.UpdateExerciseRecordRequest;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ExerciseRecordCommandService {

    private final ExerciseRecordRepository exerciseRecordRepository;

    private final ExerciseRecordSupport exerciseRecordSupport;

    public ExerciseRecordCommandService(
            ExerciseRecordRepository exerciseRecordRepository,
            ExerciseRecordSupport exerciseRecordSupport
    ) {
        this.exerciseRecordRepository = exerciseRecordRepository;
        this.exerciseRecordSupport = exerciseRecordSupport;
    }

    public ExerciseRecordResponse create(Long userId, CreateExerciseRecordRequest request) {
        UserProfile user = exerciseRecordSupport.getUser(userId);
        Exercise exercise = exerciseRecordSupport.getAccessibleExercise(userId, request.exerciseId());
        ExerciseIntensity intensity = exerciseRecordSupport.normalizeIntensity(request.intensityLevel());
        BigDecimal weightForCalculation = exerciseRecordSupport.resolveWeightForCalculation(user);

        BigDecimal calories = ExerciseRecord.calculateTotalCalories(
                exercise.getMetValue(),
                weightForCalculation,
                request.durationMinutes(),
                intensity.factor()
        );

        ExerciseRecord record = new ExerciseRecord(
                user.getId(),
                exercise.getId(),
                request.durationMinutes(),
                intensity,
                intensity.factor(),
                weightForCalculation,
                calories,
                request.recordDate()
        );

        exerciseRecordRepository.save(record);
        return exerciseRecordSupport.toResponse(record, exercise);
    }

    public ExerciseRecordResponse update(Long userId, Long recordId, UpdateExerciseRecordRequest request) {
        exerciseRecordSupport.getUser(userId);
        ExerciseRecord record = exerciseRecordSupport.getOwnedRecord(userId, recordId);
        Exercise exercise = exerciseRecordSupport.getExercise(record.getExerciseId());
        ExerciseIntensity intensity = exerciseRecordSupport.normalizeIntensity(request.intensityLevel());

        record.setDurationMinutes(request.durationMinutes());
        record.setIntensityLevel(intensity);
        record.setIntensityFactor(intensity.factor());
        record.setRecordDate(request.recordDate());
        record.setTotalCalories(ExerciseRecord.calculateTotalCalories(
                exercise.getMetValue(),
                record.getWeightKgSnapshot(),
                request.durationMinutes(),
                intensity.factor()
        ));

        exerciseRecordRepository.save(record);
        return exerciseRecordSupport.toResponse(record, exercise);
    }

    public boolean deleteById(Long userId, Long recordId) {
        exerciseRecordSupport.getUser(userId);
        ExerciseRecord record = exerciseRecordSupport.getOwnedRecord(userId, recordId);
        exerciseRecordRepository.deleteById(record.getId());
        return true;
    }
}
