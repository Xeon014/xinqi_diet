package com.diet.app.record.exercise;

import com.diet.domain.exercise.Exercise;
import com.diet.domain.exercise.ExerciseRecord;
import com.diet.domain.exercise.ExerciseRecordRepository;
import com.diet.api.exercise.ExerciseRecordHistoryResponse;
import com.diet.api.exercise.ExerciseRecordResponse;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ExerciseRecordQueryService {

    private static final int DEFAULT_HISTORY_PAGE_SIZE = 30;

    private static final int MAX_HISTORY_PAGE_SIZE = 60;

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

    public ExerciseRecordResponse getById(Long userId, Long recordId) {
        ExerciseRecord record = exerciseRecordSupport.getOwnedRecord(userId, recordId);
        Exercise exercise = exerciseRecordSupport.getAccessibleExercise(userId, record.getExerciseId());
        return exerciseRecordSupport.toResponse(record, exercise);
    }

    public ExerciseRecordHistoryResponse getHistory(
            Long userId,
            LocalDate cursorRecordDate,
            LocalDateTime cursorCreatedAt,
            Long cursorId,
            Integer pageSize
    ) {
        if ((cursorRecordDate == null) != (cursorCreatedAt == null) || (cursorRecordDate == null) != (cursorId == null)) {
            throw new IllegalArgumentException("cursorRecordDate、cursorCreatedAt 和 cursorId 必须同时传入");
        }

        int resolvedPageSize = resolveHistoryPageSize(pageSize);
        List<ExerciseRecord> queryResult = exerciseRecordRepository.findByUserWithCursor(
                userId,
                cursorRecordDate,
                cursorCreatedAt,
                cursorId,
                resolvedPageSize + 1
        );
        boolean hasMore = queryResult.size() > resolvedPageSize;
        List<ExerciseRecord> pageRecords = hasMore ? queryResult.subList(0, resolvedPageSize) : queryResult;
        List<ExerciseRecordResponse> records = pageRecords.stream()
                .map(record -> {
                    Exercise exercise = exerciseRecordSupport.getAccessibleExercise(userId, record.getExerciseId());
                    return exerciseRecordSupport.toResponse(record, exercise);
                })
                .toList();

        LocalDate nextCursorRecordDate = null;
        LocalDateTime nextCursorCreatedAt = null;
        Long nextCursorId = null;
        if (hasMore && !pageRecords.isEmpty()) {
            ExerciseRecord oldestInPage = pageRecords.get(pageRecords.size() - 1);
            nextCursorRecordDate = oldestInPage.getRecordDate();
            nextCursorCreatedAt = oldestInPage.getCreatedAt();
            nextCursorId = oldestInPage.getId();
        }

        return new ExerciseRecordHistoryResponse(
                records,
                hasMore,
                nextCursorRecordDate,
                nextCursorCreatedAt,
                nextCursorId
        );
    }

    public List<ExerciseRecord> findRecordsByUserAndDate(Long userId, LocalDate date) {
        return exerciseRecordRepository.findByUserAndDate(userId, date);
    }

    public List<ExerciseRecord> findRecordsByUserAndDateRange(Long userId, LocalDate startDate, LocalDate endDate) {
        return exerciseRecordRepository.findByUserAndDateRange(userId, startDate, endDate);
    }

    private int resolveHistoryPageSize(Integer pageSize) {
        if (pageSize == null || pageSize <= 0) {
            return DEFAULT_HISTORY_PAGE_SIZE;
        }
        return Math.min(pageSize, MAX_HISTORY_PAGE_SIZE);
    }
}
