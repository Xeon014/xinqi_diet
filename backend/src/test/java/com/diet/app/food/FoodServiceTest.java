package com.diet.app.food;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.diet.types.common.ConflictException;
import com.diet.types.common.NotFoundException;
import com.diet.domain.combo.MealComboRepository;
import com.diet.domain.food.Food;
import com.diet.domain.food.FoodCalorieUnit;
import com.diet.domain.food.FoodQuantityUnit;
import com.diet.domain.food.FoodRepository;
import com.diet.domain.record.MealRecordRepository;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.api.food.CreateFoodRequest;
import com.diet.api.food.FoodListResponse;
import com.diet.api.food.FoodResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FoodServiceTest {

    @Mock
    private FoodRepository foodRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private MealRecordRepository mealRecordRepository;

    @Mock
    private MealComboRepository mealComboRepository;

    private FoodService foodService;

    @BeforeEach
    void setUp() {
        foodService = new FoodService(
                foodRepository,
                userProfileRepository,
                mealRecordRepository,
                mealComboRepository
        );
    }

    @Test
    void shouldCreateCustomFoodForCurrentUser() {
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(buildUser(1L)));
        when(foodRepository.findByAccessibleNameIgnoreCase(1L, "无糖酸奶")).thenReturn(Optional.empty());
        doAnswer(invocation -> {
            Food food = invocation.getArgument(0);
            food.setId(10L);
            return null;
        }).when(foodRepository).save(any(Food.class));

        FoodResponse response = foodService.create(
                1L,
                new CreateFoodRequest(
                        "  无糖酸奶  ",
                        new BigDecimal("276"),
                        new BigDecimal("3.5"),
                        new BigDecimal("6.0"),
                        new BigDecimal("2.8"),
                        "饮品",
                        FoodCalorieUnit.KJ,
                        FoodQuantityUnit.ML
                )
        );

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.userId()).isEqualTo(1L);
        assertThat(response.name()).isEqualTo("无糖酸奶");
        assertThat(response.caloriesPer100g()).isEqualByComparingTo("65.97");
        assertThat(response.displayCaloriesPer100()).isEqualByComparingTo("276.02");
        assertThat(response.calorieUnit()).isEqualTo(FoodCalorieUnit.KJ);
        assertThat(response.quantityUnit()).isEqualTo(FoodQuantityUnit.ML);
        assertThat(response.isBuiltin()).isFalse();
    }

    @Test
    void shouldUseDefaultUnitsWhenRequestUnitMissing() {
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(buildUser(1L)));
        when(foodRepository.findByAccessibleNameIgnoreCase(1L, "水煮蛋")).thenReturn(Optional.empty());
        doAnswer(invocation -> {
            Food food = invocation.getArgument(0);
            food.setId(100L);
            return null;
        }).when(foodRepository).save(any(Food.class));

        FoodResponse response = foodService.create(
                1L,
                new CreateFoodRequest(
                        "水煮蛋",
                        new BigDecimal("155"),
                        new BigDecimal("13"),
                        new BigDecimal("1.1"),
                        new BigDecimal("11"),
                        "其他",
                        null,
                        null
                )
        );

        assertThat(response.calorieUnit()).isEqualTo(FoodCalorieUnit.KCAL);
        assertThat(response.quantityUnit()).isEqualTo(FoodQuantityUnit.G);
        assertThat(response.caloriesPer100g()).isEqualByComparingTo("155.00");
        assertThat(response.displayCaloriesPer100()).isEqualByComparingTo("155.00");
    }

    @Test
    void shouldOnlyReturnOwnedCustomFoodsWhenScopeIsCustom() {
        when(foodRepository.findPage(1L, "酸奶", null, true, false, 0, 50))
                .thenReturn(List.of(buildCustomFood(10L, 1L, "无糖酸奶")));
        when(foodRepository.countPage(1L, "酸奶", null, true, false)).thenReturn(1L);

        FoodListResponse response = foodService.findAll(1L, "酸奶", null, 1, 50, FoodService.SCOPE_CUSTOM);

        assertThat(response.foods()).hasSize(1);
        assertThat(response.foods().get(0).name()).isEqualTo("无糖酸奶");
        assertThat(response.total()).isEqualTo(1);
        verify(foodRepository, never()).findAll(any(), any());
    }

    @Test
    void shouldNormalizeCategoryAndPageArgumentsWhenQueryingFoods() {
        Food builtinFood = buildBuiltinFood(20L, "鸡胸肉", "https://example.com/chicken.jpg");
        when(foodRepository.findPage(null, "鸡胸肉", "主食", false, false, 0, 100))
                .thenReturn(List.of(builtinFood));
        when(foodRepository.countPage(null, "鸡胸肉", "主食", false, false)).thenReturn(1L);

        FoodListResponse response = foodService.findAll(null, "  鸡胸肉  ", "STAPLE", 0, 999, FoodService.SCOPE_ALL);

        assertThat(response.page()).isEqualTo(1);
        assertThat(response.size()).isEqualTo(100);
        assertThat(response.total()).isEqualTo(1);
        assertThat(response.foods().get(0).imageUrl()).isEqualTo("https://example.com/chicken.jpg");
    }

    @Test
    void shouldUseBuiltinOnlyModeForCategoryBrowse() {
        when(foodRepository.findPage(null, null, "主食", false, true, 0, 50))
                .thenReturn(List.of(buildBuiltinFood(30L, "糙米饭", null)));
        when(foodRepository.countPage(null, null, "主食", false, true)).thenReturn(1L);

        FoodListResponse response = foodService.findAll(null, null, "主食", 1, 50, FoodService.SCOPE_ALL);

        assertThat(response.foods()).hasSize(1);
    }

    @Test
    void shouldRejectDeleteWhenFoodUsedByMealRecord() {
        Food food = buildCustomFood(99L, 1L, "自制燕麦杯");
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(buildUser(1L)));
        when(foodRepository.findOwnedCustomById(1L, 99L)).thenReturn(Optional.of(food));
        when(mealRecordRepository.countByFoodId(99L)).thenReturn(1L);

        assertThatThrownBy(() -> foodService.delete(1L, 99L))
                .isInstanceOf(ConflictException.class)
                .hasMessage("该食物已被饮食记录使用，无法删除");

        verify(foodRepository, never()).deleteById(any(Long.class));
    }

    @Test
    void shouldReturnNotFoundWhenDeletingNonOwnedFood() {
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(buildUser(1L)));
        when(foodRepository.findOwnedCustomById(1L, 99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> foodService.delete(1L, 99L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("food not found, id=99");
    }

    @Test
    void shouldRejectDeleteWhenFoodUsedByMealCombo() {
        Food food = buildCustomFood(99L, 1L, "自制沙拉");
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(buildUser(1L)));
        when(foodRepository.findOwnedCustomById(1L, 99L)).thenReturn(Optional.of(food));
        when(mealRecordRepository.countByFoodId(99L)).thenReturn(0L);
        when(mealComboRepository.countItemsByFoodId(99L)).thenReturn(2L);

        assertThatThrownBy(() -> foodService.delete(1L, 99L))
                .isInstanceOf(ConflictException.class)
                .hasMessage("该食物已被套餐使用，无法删除");

        verify(foodRepository, never()).deleteById(any(Long.class));
    }

    private UserProfile buildUser(Long userId) {
        UserProfile user = new UserProfile();
        user.setId(userId);
        return user;
    }

    private Food buildCustomFood(Long foodId, Long userId, String name) {
        Food food = new Food(
                userId,
                name,
                new BigDecimal("120"),
                new BigDecimal("8"),
                new BigDecimal("10"),
                new BigDecimal("4"),
                "其他"
        );
        food.setId(foodId);
        return food;
    }

    private Food buildBuiltinFood(Long foodId, String name, String imageUrl) {
        Food food = new Food(
                null,
                name,
                new BigDecimal("120"),
                new BigDecimal("8"),
                new BigDecimal("10"),
                new BigDecimal("4"),
                "主食"
        );
        food.setId(foodId);
        food.setBuiltin(true);
        food.setImageUrl(imageUrl);
        return food;
    }
}
