package com.diet.app.record.meal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.diet.domain.food.Food;
import com.diet.domain.food.FoodRepository;
import com.diet.domain.record.MealRecord;
import com.diet.domain.record.MealRecordRepository;
import com.diet.domain.record.MealType;
import com.diet.domain.user.UserProfileRepository;
import com.diet.api.record.MealRecordHistoryResponse;
import com.diet.api.record.MealRecordResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MealRecordQueryServiceTest {

    @Mock
    private MealRecordRepository mealRecordRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private FoodRepository foodRepository;

    private MealRecordQueryService mealRecordQueryService;

    @BeforeEach
    void setUp() {
        MealRecordSupport mealRecordSupport = new MealRecordSupport(
                mealRecordRepository,
                userProfileRepository,
                foodRepository
        );
        mealRecordQueryService = new MealRecordQueryService(mealRecordRepository, mealRecordSupport);
    }

    @Test
    void shouldReturnOwnedRecordById() {
        Long userId = 1L;
        Long recordId = 101L;
        MealRecord record = buildRecord(recordId, userId, 201L, MealType.LUNCH, "2026-04-01", "2026-04-01T12:30:00");
        Food food = buildFood(201L, "鸡胸肉");

        when(mealRecordRepository.findById(recordId)).thenReturn(Optional.of(record));
        when(foodRepository.findAccessibleById(userId, food.getId())).thenReturn(Optional.of(food));

        MealRecordResponse response = mealRecordQueryService.getById(userId, recordId);

        assertThat(response.id()).isEqualTo(recordId);
        assertThat(response.foodId()).isEqualTo(food.getId());
        assertThat(response.foodName()).isEqualTo("鸡胸肉");
        assertThat(response.mealType()).isEqualTo(MealType.LUNCH);
    }

    @Test
    void shouldReturnHistoryPageWithNextCursor() {
        Long userId = 1L;
        MealRecord latest = buildRecord(101L, userId, 201L, MealType.BREAKFAST, "2026-04-02", "2026-04-02T08:10:00");
        MealRecord older = buildRecord(102L, userId, 202L, MealType.BREAKFAST, "2026-04-01", "2026-04-01T07:40:00");
        MealRecord extra = buildRecord(103L, userId, 203L, MealType.BREAKFAST, "2026-03-31", "2026-03-31T07:20:00");

        when(mealRecordRepository.findByUserWithCursor(userId, MealType.BREAKFAST, null, null, null, 3))
                .thenReturn(List.of(latest, older, extra));
        when(foodRepository.findAccessibleById(userId, 201L)).thenReturn(Optional.of(buildFood(201L, "燕麦")));
        when(foodRepository.findAccessibleById(userId, 202L)).thenReturn(Optional.of(buildFood(202L, "鸡蛋")));

        MealRecordHistoryResponse response = mealRecordQueryService.getHistory(
                userId,
                MealType.BREAKFAST,
                null,
                null,
                null,
                2
        );

        assertThat(response.records()).hasSize(2);
        assertThat(response.records().get(0).foodName()).isEqualTo("燕麦");
        assertThat(response.records().get(1).foodName()).isEqualTo("鸡蛋");
        assertThat(response.hasMore()).isTrue();
        assertThat(response.nextCursorRecordDate()).isEqualTo(LocalDate.of(2026, 4, 1));
        assertThat(response.nextCursorCreatedAt()).isEqualTo(LocalDateTime.of(2026, 4, 1, 7, 40));
        assertThat(response.nextCursorId()).isEqualTo(102L);
    }

    private Food buildFood(Long foodId, String name) {
        Food food = new Food(
                null,
                name,
                new BigDecimal("165"),
                new BigDecimal("31"),
                BigDecimal.ZERO,
                new BigDecimal("3.6"),
                "肉蛋奶"
        );
        food.setId(foodId);
        return food;
    }

    private MealRecord buildRecord(
            Long recordId,
            Long userId,
            Long foodId,
            MealType mealType,
            String recordDate,
            String createdAt
    ) {
        MealRecord record = new MealRecord(
                userId,
                foodId,
                mealType,
                new BigDecimal("100"),
                new BigDecimal("165.00"),
                LocalDate.parse(recordDate)
        );
        record.setId(recordId);
        record.setCreatedAt(LocalDateTime.parse(createdAt));
        return record;
    }
}
