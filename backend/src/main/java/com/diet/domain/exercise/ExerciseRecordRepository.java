package com.diet.domain.exercise;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ExerciseRecordRepository {

    long count();

    void save(ExerciseRecord exerciseRecord);

    Optional<ExerciseRecord> findById(Long id);

    void deleteById(Long id);

    long countByExerciseId(Long exerciseId);

    List<ExerciseRecord> findByUserAndDate(Long userId, LocalDate date);

    List<ExerciseRecord> findByUserAndDateRange(Long userId, LocalDate startDate, LocalDate endDate);

    List<ExerciseRecord> findByUserWithCursor(
            Long userId,
            LocalDate cursorRecordDate,
            LocalDateTime cursorCreatedAt,
            Long cursorId,
            int limit
    );
}
