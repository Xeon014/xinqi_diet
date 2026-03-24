package com.diet.app.record.meal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.diet.domain.food.Food;
import com.diet.domain.food.FoodRepository;
import com.diet.domain.record.MealRecord;
import com.diet.domain.record.MealRecordRepository;
import com.diet.domain.record.MealType;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.api.record.MealRecordResponse;
import com.diet.api.record.UpdateMealRecordRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MealRecordCommandServiceTest {

    @Mock
    private MealRecordRepository mealRecordRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private FoodRepository foodRepository;

    private MealRecordCommandService mealRecordCommandService;

    @BeforeEach
    void setUp() {
        MealRecordSupport mealRecordSupport = new MealRecordSupport(
                mealRecordRepository,
                userProfileRepository,
                foodRepository
        );
        mealRecordCommandService = new MealRecordCommandService(mealRecordRepository, mealRecordSupport);
    }

    @Test
    void shouldUpdateQuantityMealTypeAndRecordDate() {
        Long userId = 1L;
        Long recordId = 11L;
        Food food = buildFood(101L, "鸡胸肉");
        MealRecord record = buildRecord(recordId, userId, food.getId());

        when(userProfileRepository.findById(userId)).thenReturn(Optional.of(buildUser(userId)));
        when(mealRecordRepository.findById(recordId)).thenReturn(Optional.of(record));
        when(foodRepository.findAccessibleById(userId, food.getId())).thenReturn(Optional.of(food));

        MealRecordResponse response = mealRecordCommandService.updateRecord(
                userId,
                recordId,
                new UpdateMealRecordRequest(
                        new BigDecimal("180"),
                        MealType.DINNER,
                        LocalDate.of(2026, 3, 15)
                )
        );

        assertThat(response.quantityInGram()).isEqualByComparingTo("180");
        assertThat(response.mealType()).isEqualTo(MealType.DINNER);
        assertThat(response.recordDate()).isEqualTo(LocalDate.of(2026, 3, 15));
        assertThat(response.totalCalories()).isEqualByComparingTo("297.00");
        assertThat(record.getQuantityInGram()).isEqualByComparingTo("180");
        assertThat(record.getMealType()).isEqualTo(MealType.DINNER);
        assertThat(record.getRecordDate()).isEqualTo(LocalDate.of(2026, 3, 15));
        assertThat(record.getTotalCalories()).isEqualByComparingTo("297.00");
        verify(mealRecordRepository).save(record);
    }

    private UserProfile buildUser(Long userId) {
        UserProfile user = new UserProfile();
        user.setId(userId);
        return user;
    }

    private Food buildFood(Long foodId, String name) {
        Food food = new Food(
                null,
                name,
                new BigDecimal("165"),
                new BigDecimal("31"),
                new BigDecimal("0"),
                new BigDecimal("3.6"),
                "肉蛋奶"
        );
        food.setId(foodId);
        return food;
    }

    private MealRecord buildRecord(Long recordId, Long userId, Long foodId) {
        MealRecord record = new MealRecord(
                userId,
                foodId,
                MealType.LUNCH,
                new BigDecimal("100"),
                new BigDecimal("165.00"),
                LocalDate.of(2026, 3, 14)
        );
        record.setId(recordId);
        record.setCreatedAt(LocalDateTime.of(2026, 3, 14, 12, 0));
        return record;
    }
}
