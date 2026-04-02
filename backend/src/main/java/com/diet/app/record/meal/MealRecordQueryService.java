package com.diet.app.record.meal;

import com.diet.domain.food.Food;
import com.diet.domain.record.MealRecord;
import com.diet.domain.record.MealRecordRepository;
import com.diet.domain.record.MealType;
import com.diet.api.record.MealRecordHistoryResponse;
import com.diet.api.record.MealRecordResponse;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class MealRecordQueryService {

    private static final int DEFAULT_HISTORY_PAGE_SIZE = 30;

    private static final int MAX_HISTORY_PAGE_SIZE = 60;

    private final MealRecordRepository mealRecordRepository;

    private final MealRecordSupport mealRecordSupport;

    public MealRecordQueryService(
            MealRecordRepository mealRecordRepository,
            MealRecordSupport mealRecordSupport
    ) {
        this.mealRecordRepository = mealRecordRepository;
        this.mealRecordSupport = mealRecordSupport;
    }

    public List<MealRecordResponse> findByUserAndDate(Long userId, LocalDate date) {
        return findByUserAndDate(userId, date, null);
    }

    public List<MealRecordResponse> findByUserAndDate(Long userId, LocalDate date, MealType mealType) {
        List<MealRecord> records = mealType == null
                ? mealRecordRepository.findByUserAndDate(userId, date)
                : mealRecordRepository.findByUserAndDateAndMealType(userId, date, mealType);

        return records.stream()
                .map(record -> {
                    Food food = mealRecordSupport.getAccessibleFood(userId, record.getFoodId());
                    return mealRecordSupport.toResponse(record, food);
                })
                .toList();
    }

    public MealRecordResponse getById(Long userId, Long recordId) {
        MealRecord record = mealRecordSupport.getOwnedRecord(userId, recordId);
        Food food = mealRecordSupport.getAccessibleFood(userId, record.getFoodId());
        return mealRecordSupport.toResponse(record, food);
    }

    public MealRecordHistoryResponse getHistory(
            Long userId,
            MealType mealType,
            LocalDate cursorRecordDate,
            LocalDateTime cursorCreatedAt,
            Long cursorId,
            Integer pageSize
    ) {
        if ((cursorRecordDate == null) != (cursorCreatedAt == null) || (cursorRecordDate == null) != (cursorId == null)) {
            throw new IllegalArgumentException("cursorRecordDate、cursorCreatedAt 和 cursorId 必须同时传入");
        }

        int resolvedPageSize = resolveHistoryPageSize(pageSize);
        List<MealRecord> queryResult = mealRecordRepository.findByUserWithCursor(
                userId,
                mealType,
                cursorRecordDate,
                cursorCreatedAt,
                cursorId,
                resolvedPageSize + 1
        );
        boolean hasMore = queryResult.size() > resolvedPageSize;
        List<MealRecord> pageRecords = hasMore ? queryResult.subList(0, resolvedPageSize) : queryResult;
        List<MealRecordResponse> records = pageRecords.stream()
                .map(record -> {
                    Food food = mealRecordSupport.getAccessibleFood(userId, record.getFoodId());
                    return mealRecordSupport.toResponse(record, food);
                })
                .toList();

        LocalDate nextCursorRecordDate = null;
        LocalDateTime nextCursorCreatedAt = null;
        Long nextCursorId = null;
        if (hasMore && !pageRecords.isEmpty()) {
            MealRecord oldestInPage = pageRecords.get(pageRecords.size() - 1);
            nextCursorRecordDate = oldestInPage.getRecordDate();
            nextCursorCreatedAt = oldestInPage.getCreatedAt();
            nextCursorId = oldestInPage.getId();
        }

        return new MealRecordHistoryResponse(
                records,
                hasMore,
                nextCursorRecordDate,
                nextCursorCreatedAt,
                nextCursorId
        );
    }

    public List<MealRecord> findRecordsByUserAndDate(Long userId, LocalDate date) {
        return mealRecordRepository.findByUserAndDate(userId, date);
    }

    public List<MealRecord> findRecordsByUserAndDateRange(Long userId, LocalDate startDate, LocalDate endDate) {
        return mealRecordRepository.findByUserAndDateRange(userId, startDate, endDate);
    }

    private int resolveHistoryPageSize(Integer pageSize) {
        if (pageSize == null || pageSize <= 0) {
            return DEFAULT_HISTORY_PAGE_SIZE;
        }
        return Math.min(pageSize, MAX_HISTORY_PAGE_SIZE);
    }
}
