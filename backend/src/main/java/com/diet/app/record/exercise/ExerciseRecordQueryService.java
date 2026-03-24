package com.diet.app.record.exercise;

import com.diet.domain.exercise.Exercise;
import com.diet.domain.exercise.ExerciseRecord;
import com.diet.domain.exercise.ExerciseRecordRepository;
import com.diet.api.exercise.ExerciseRecordResponse;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ExerciseRecordQueryService {

    private final ExerciseRecordRepository exerciseRecordRepository;

    private final ExerciseRecordSupport exerciseRecordSupport;

    public ExerciseRecordQueryService(
            ExerciseRecordRepository exerciseRecordRepository,
            ExerciseRecordSupport exerciseRecordSupport
    ) {
        this.exerciseRecordRepository = exerciseRecordRepository;
        this.exerciseRecordSupport = exerciseRecordSupport;
    }

    public List<ExerciseRecordResponse> findByUserAndDate(Long userId, LocalDate date) {
        List<ExerciseRecord> records = exerciseRecordRepository.findByUserAndDate(userId, date);
        return records.stream()
                .map(record -> {
                    Exercise exercise = exerciseRecordSupport.getExercise(record.getExerciseId());
                    return exerciseRecordSupport.toResponse(record, exercise);
                })
                .toList();
    }

    public List<ExerciseRecord> findRecordsByUserAndDate(Long userId, LocalDate date) {
        return exerciseRecordRepository.findByUserAndDate(userId, date);
    }

    public List<ExerciseRecord> findRecordsByUserAndDateRange(Long userId, LocalDate startDate, LocalDate endDate) {
        return exerciseRecordRepository.findByUserAndDateRange(userId, startDate, endDate);
    }
}
