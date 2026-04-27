package com.diet.app.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.diet.app.record.exercise.ExerciseRecordQueryService;
import com.diet.app.record.meal.MealRecordQueryService;
import com.diet.api.user.ActionSuggestionResponse;
import com.diet.api.user.DailySummaryResponse;
import com.diet.domain.exercise.ExerciseRepository;
import com.diet.domain.food.FoodRepository;
import com.diet.domain.user.UserProfile;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DailySummaryQueryServiceTest {

    private static final String CORRUPTED_PLACEHOLDER = "??" + "??";

    @Mock
    private FoodRepository foodRepository;

    @Mock
    private ExerciseRepository exerciseRepository;

    @Mock
    private UserProfileSupport userProfileSupport;

    @Mock
    private ProgressQueryService progressQueryService;

    @Mock
    private MealRecordQueryService mealRecordQueryService;

    @Mock
    private ExerciseRecordQueryService exerciseRecordQueryService;

    private DailySummaryQueryService dailySummaryQueryService;

    @BeforeEach
    void setUp() {
        dailySummaryQueryService = new DailySummaryQueryService(
                foodRepository,
                exerciseRepository,
                userProfileSupport,
                progressQueryService,
                mealRecordQueryService,
                exerciseRecordQueryService
        );
    }

    @Test
    void shouldReturnReadableChineseInsightWhenTargetIsMissing() {
        LocalDate date = LocalDate.of(2026, 4, 27);
        UserProfile user = new UserProfile();
        when(userProfileSupport.getUser(1L)).thenReturn(user);
        when(userProfileSupport.resolveEffectiveTargetCalories(user)).thenReturn(null);
        when(mealRecordQueryService.findRecordsByUserAndDate(1L, date)).thenReturn(List.of());
        when(exerciseRecordQueryService.findRecordsByUserAndDate(1L, date)).thenReturn(List.of());

        DailySummaryResponse response = dailySummaryQueryService.getDailySummary(1L, date);

        assertReadableText(response.dailyInsight().summaryText());
        assertThat(response.dailyInsight().summaryText()).contains("目标热量");
    }

    @Test
    void shouldReturnReadableChineseActionSuggestions() {
        LocalDate date = LocalDate.of(2026, 4, 27);
        UserProfile user = new UserProfile();
        when(userProfileSupport.getUser(1L)).thenReturn(user);
        when(userProfileSupport.resolveEffectiveTargetCalories(user)).thenReturn(1800);
        when(mealRecordQueryService.findRecordsByUserAndDate(1L, date)).thenReturn(List.of());
        when(exerciseRecordQueryService.findRecordsByUserAndDate(1L, date)).thenReturn(List.of());

        DailySummaryResponse response = dailySummaryQueryService.getDailySummary(1L, date);

        List<ActionSuggestionResponse> suggestions = response.dailyInsight().suggestions();
        assertThat(suggestions).isNotEmpty();
        suggestions.forEach(suggestion -> {
            assertReadableText(suggestion.title());
            assertReadableText(suggestion.description());
        });
        assertThat(suggestions.get(0).title()).isEqualTo("补记餐次");
    }

    private void assertReadableText(String text) {
        assertThat(text).isNotBlank();
        assertThat(text).doesNotContain(CORRUPTED_PLACEHOLDER);
        assertThat(text).doesNotContain("\uFFFD");
    }
}
