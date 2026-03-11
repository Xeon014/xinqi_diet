package com.diet.service;

import com.diet.common.NotFoundException;
import com.diet.domain.exercise.Exercise;
import com.diet.domain.exercise.ExerciseIntensity;
import com.diet.domain.exercise.ExerciseRecord;
import com.diet.domain.exercise.ExerciseRecordRepository;
import com.diet.domain.exercise.ExerciseRepository;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.exercise.CreateExerciseRecordRequest;
import com.diet.dto.exercise.ExerciseRecordResponse;
import com.diet.dto.exercise.UpdateExerciseRecordRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ExerciseRecordService {

    private static final BigDecimal ESTIMATED_WEIGHT_KG = new BigDecimal("60.00");

    private final ExerciseRecordRepository exerciseRecordRepository;

    private final UserProfileRepository userProfileRepository;

    private final ExerciseRepository exerciseRepository;

    public ExerciseRecordService(
            ExerciseRecordRepository exerciseRecordRepository,
            UserProfileRepository userProfileRepository,
            ExerciseRepository exerciseRepository
    ) {
        this.exerciseRecordRepository = exerciseRecordRepository;
        this.userProfileRepository = userProfileRepository;
        this.exerciseRepository = exerciseRepository;
    }

    public ExerciseRecordResponse create(Long userId, CreateExerciseRecordRequest request) {
        UserProfile user = getUser(userId);
        Exercise exercise = getExercise(request.exerciseId());
        ExerciseIntensity intensity = normalizeIntensity(request.intensityLevel());
        BigDecimal weightForCalculation = resolveWeightForCalculation(user);

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
        return toResponse(record, exercise);
    }

    public ExerciseRecordResponse update(Long userId, Long recordId, UpdateExerciseRecordRequest request) {
        getUser(userId);
        ExerciseRecord record = getOwnedRecord(userId, recordId);
        Exercise exercise = getExercise(record.getExerciseId());
        ExerciseIntensity intensity = normalizeIntensity(request.intensityLevel());

        record.setDurationMinutes(request.durationMinutes());
        record.setIntensityLevel(intensity);
        record.setIntensityFactor(intensity.factor());
        record.setTotalCalories(ExerciseRecord.calculateTotalCalories(
                exercise.getMetValue(),
                record.getWeightKgSnapshot(),
                request.durationMinutes(),
                intensity.factor()
        ));

        exerciseRecordRepository.save(record);
        return toResponse(record, exercise);
    }

    public boolean deleteById(Long userId, Long recordId) {
        getUser(userId);
        ExerciseRecord record = getOwnedRecord(userId, recordId);
        exerciseRecordRepository.deleteById(record.getId());
        return true;
    }

    @Transactional(readOnly = true)
    public List<ExerciseRecordResponse> findByUserAndDate(Long userId, LocalDate date) {
        List<ExerciseRecord> records = exerciseRecordRepository.findByUserAndDate(userId, date);
        return records.stream()
                .map(record -> toResponse(record, getExercise(record.getExerciseId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ExerciseRecord> findEntitiesByUserAndDate(Long userId, LocalDate date) {
        return exerciseRecordRepository.findByUserAndDate(userId, date);
    }

    @Transactional(readOnly = true)
    public List<ExerciseRecord> findEntitiesByUserAndDateRange(Long userId, LocalDate startDate, LocalDate endDate) {
        return exerciseRecordRepository.findByUserAndDateRange(userId, startDate, endDate);
    }

    private ExerciseRecordResponse toResponse(ExerciseRecord record, Exercise exercise) {
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

    private ExerciseRecord getOwnedRecord(Long userId, Long recordId) {
        ExerciseRecord record = exerciseRecordRepository.findById(recordId)
                .orElseThrow(() -> new NotFoundException("exercise record not found, id=" + recordId));
        if (!record.getUserId().equals(userId)) {
            throw new NotFoundException("exercise record not found, id=" + recordId);
        }
        return record;
    }

    private UserProfile getUser(Long userId) {
        return userProfileRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("user not found, id=" + userId));
    }

    private Exercise getExercise(Long exerciseId) {
        return exerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new NotFoundException("exercise not found, id=" + exerciseId));
    }

    private ExerciseIntensity normalizeIntensity(ExerciseIntensity intensityLevel) {
        return intensityLevel == null ? ExerciseIntensity.MEDIUM : intensityLevel;
    }

    private BigDecimal resolveWeightForCalculation(UserProfile user) {
        if (user.getCurrentWeight() != null && user.getCurrentWeight().compareTo(BigDecimal.ZERO) > 0) {
            return user.getCurrentWeight();
        }
        return ESTIMATED_WEIGHT_KG;
    }
}
