package com.diet.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.diet.domain.metric.BodyMetricRecord;
import com.diet.domain.metric.BodyMetricRecordRepository;
import com.diet.domain.metric.BodyMetricType;
import com.diet.domain.user.Gender;
import com.diet.domain.user.GoalCalorieStrategy;
import com.diet.domain.user.GoalMode;
import com.diet.dto.user.GoalPlanPreviewResponse;
import com.diet.dto.user.GoalWarningLevel;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GoalPlanningServiceTest {

    @Mock
    private BodyMetricRecordRepository bodyMetricRecordRepository;

    private GoalPlanningService goalPlanningService;

    @BeforeEach
    void setUp() {
        goalPlanningService = new GoalPlanningService(bodyMetricRecordRepository);
    }

    @Test
    void shouldRecommendSmartLossCaloriesFromTargetWeightAndDate() {
        GoalPlanPreviewResponse response = goalPlanningService.preview(new GoalPlanningService.GoalPlanningProfile(
                null,
                Gender.FEMALE,
                LocalDate.of(2000, 1, 1),
                new BigDecimal("165.00"),
                new BigDecimal("60.00"),
                new BigDecimal("58.00"),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                LocalDate.now().plusDays(35),
                GoalCalorieStrategy.SMART
        ));

        assertThat(response.goalMode()).isEqualTo(GoalMode.LOSE);
        assertThat(response.recommendedGoalCalorieDelta()).isEqualTo(-440);
        assertThat(response.recommendedDailyCalorieTarget()).isEqualTo(1475);
        assertThat(response.plannedWeeklyChangeKg()).isEqualByComparingTo("-0.40");
        assertThat(response.warningLevel()).isEqualTo(GoalWarningLevel.NONE);
    }

    @Test
    void shouldTreatTargetWeightWithinPointThreeKgAsMaintain() {
        GoalPlanPreviewResponse response = goalPlanningService.preview(new GoalPlanningService.GoalPlanningProfile(
                null,
                Gender.FEMALE,
                LocalDate.of(2000, 1, 1),
                new BigDecimal("165.00"),
                new BigDecimal("60.00"),
                new BigDecimal("60.30"),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                GoalCalorieStrategy.SMART
        ));

        assertThat(response.goalMode()).isEqualTo(GoalMode.MAINTAIN);
        assertThat(response.recommendedGoalCalorieDelta()).isZero();
        assertThat(response.warningLevel()).isEqualTo(GoalWarningLevel.NONE);
    }

    @Test
    void shouldRequireGoalDateWhenTargetWeightExceedsMaintainGap() {
        assertThatThrownBy(() -> goalPlanningService.preview(new GoalPlanningService.GoalPlanningProfile(
                null,
                Gender.FEMALE,
                LocalDate.of(2000, 1, 1),
                new BigDecimal("165.00"),
                new BigDecimal("60.00"),
                new BigDecimal("60.31"),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                GoalCalorieStrategy.SMART
        )))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("预期达成日期");
    }

    @Test
    void shouldApplyTrendAdjustmentWhenRecentWeightChangeIsOffPace() {
        when(bodyMetricRecordRepository.findLatestByMetricType(1L, BodyMetricType.WEIGHT))
                .thenReturn(Optional.of(buildRecord(1L, new BigDecimal("60.00"), LocalDate.now())));
        when(bodyMetricRecordRepository.findDailyLatestByMetricTypeAndDateRange(
                1L,
                BodyMetricType.WEIGHT,
                LocalDate.now().minusDays(13),
                LocalDate.now()
        )).thenReturn(List.of(
                buildRecord(10L, new BigDecimal("61.00"), LocalDate.now().minusDays(13)),
                buildRecord(11L, new BigDecimal("60.00"), LocalDate.now())
        ));

        GoalPlanPreviewResponse response = goalPlanningService.preview(new GoalPlanningService.GoalPlanningProfile(
                1L,
                Gender.FEMALE,
                LocalDate.of(2000, 1, 1),
                new BigDecimal("165.00"),
                new BigDecimal("60.00"),
                new BigDecimal("58.00"),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                LocalDate.now().plusDays(35),
                GoalCalorieStrategy.SMART
        ));

        assertThat(response.usedTrendAdjustment()).isTrue();
        assertThat(response.recommendedGoalCalorieDelta()).isGreaterThan(-440);
    }

    @Test
    void shouldWarnWhenManualTargetCaloriesAreBelowBmr() {
        GoalPlanPreviewResponse response = goalPlanningService.preview(new GoalPlanningService.GoalPlanningProfile(
                null,
                Gender.FEMALE,
                LocalDate.of(2000, 1, 1),
                new BigDecimal("165.00"),
                new BigDecimal("60.00"),
                new BigDecimal("55.00"),
                null,
                null,
                1000,
                null,
                null,
                null,
                null,
                null,
                LocalDate.now().plusDays(60),
                GoalCalorieStrategy.MANUAL
        ));

        assertThat(response.warningLevel()).isEqualTo(GoalWarningLevel.EXTREME);
        assertThat(response.warningMessage()).contains("提高目标热量");
        assertThat(response.warningMessage()).doesNotContain("放宽目标日期");
    }

    @Test
    void shouldWarnSmartPlanBelowBmrToRelaxGoalDate() {
        GoalPlanPreviewResponse response = goalPlanningService.preview(new GoalPlanningService.GoalPlanningProfile(
                null,
                Gender.FEMALE,
                LocalDate.of(2000, 1, 1),
                new BigDecimal("165.00"),
                new BigDecimal("60.00"),
                new BigDecimal("55.00"),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                LocalDate.now().plusDays(7),
                GoalCalorieStrategy.SMART
        ));

        assertThat(response.warningLevel()).isEqualTo(GoalWarningLevel.EXTREME);
        assertThat(response.warningMessage()).contains("放宽目标日期");
    }

    @Test
    void shouldRejectSmartPlanWhenTargetDateIsTooNear() {
        assertThatThrownBy(() -> goalPlanningService.preview(new GoalPlanningService.GoalPlanningProfile(
                null,
                Gender.FEMALE,
                LocalDate.of(2000, 1, 1),
                new BigDecimal("165.00"),
                new BigDecimal("60.00"),
                new BigDecimal("58.00"),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                LocalDate.now().plusDays(3),
                GoalCalorieStrategy.SMART
        )))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("7 天");
    }

    private BodyMetricRecord buildRecord(Long id, BigDecimal value, LocalDate date) {
        BodyMetricRecord record = new BodyMetricRecord();
        record.setId(id);
        record.setMetricType(BodyMetricType.WEIGHT);
        record.setMetricValue(value);
        record.setRecordDate(date);
        return record;
    }
}
