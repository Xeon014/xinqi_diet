package com.diet.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.diet.domain.metric.BodyMetricRecord;
import com.diet.domain.metric.BodyMetricRecordRepository;
import com.diet.domain.metric.BodyMetricType;
import com.diet.domain.metric.BodyMetricUnit;
import com.diet.domain.user.GoalCalorieStrategy;
import com.diet.domain.user.GoalMode;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.metric.BodyMetricHistoryResponse;
import com.diet.dto.metric.BodyMetricDeleteResponse;
import com.diet.dto.metric.BodyMetricRecordResponse;
import com.diet.dto.metric.BodyMetricSnapshotResponse;
import com.diet.dto.metric.BodyMetricTrendMetricKey;
import com.diet.dto.metric.BodyMetricTrendResponse;
import com.diet.dto.metric.CreateBodyMetricRecordRequest;
import com.diet.dto.metric.MetricTrendRangeType;
import com.diet.dto.user.GoalPlanPreviewResponse;
import com.diet.dto.user.GoalWarningLevel;
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
class BodyMetricRecordServiceTest {

    @Mock
    private BodyMetricRecordRepository bodyMetricRecordRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private GoalPlanningService goalPlanningService;

    private BodyMetricRecordService bodyMetricRecordService;

    @BeforeEach
    void setUp() {
        bodyMetricRecordService = new BodyMetricRecordService(bodyMetricRecordRepository, userProfileRepository, goalPlanningService);
    }

    @Test
    void shouldCreateWeightRecordAndSyncCurrentWeightWhenRecordDateIsToday() {
        UserProfile user = buildUser(1L, new BigDecimal("62.00"));
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(user));
        doAnswer(invocation -> {
            BodyMetricRecord record = invocation.getArgument(0);
            record.setId(100L);
            return null;
        }).when(bodyMetricRecordRepository).save(any(BodyMetricRecord.class));

        BodyMetricRecordResponse response = bodyMetricRecordService.create(
                1L,
                new CreateBodyMetricRecordRequest(
                        null,
                        BodyMetricType.WEIGHT,
                        new BigDecimal("61.50"),
                        BodyMetricUnit.KG,
                        LocalDate.now()
                )
        );

        assertThat(response.id()).isEqualTo(100L);
        assertThat(response.metricValue()).isEqualByComparingTo("61.50");
        assertThat(user.getCurrentWeight()).isEqualByComparingTo("61.50");
        verify(userProfileRepository).update(user);
    }

    @Test
    void shouldRefreshSmartGoalSnapshotWhenCreateTodayWeightRecord() {
        UserProfile user = buildUser(1L, new BigDecimal("62.00"));
        user.setGoalCalorieStrategy(GoalCalorieStrategy.SMART);
        user.setGoalTargetDate(LocalDate.now().plusDays(21));
        user.setTargetWeight(new BigDecimal("58.00"));
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(user));
        when(goalPlanningService.preview(any())).thenReturn(new GoalPlanPreviewResponse(
                1650,
                -350,
                GoalMode.LOSE,
                new BigDecimal("-0.32"),
                GoalWarningLevel.NONE,
                "",
                true
        ));

        bodyMetricRecordService.create(
                1L,
                new CreateBodyMetricRecordRequest(
                        null,
                        BodyMetricType.WEIGHT,
                        new BigDecimal("61.20"),
                        BodyMetricUnit.KG,
                        LocalDate.now()
                )
        );

        assertThat(user.getCurrentWeight()).isEqualByComparingTo("61.20");
        assertThat(user.getDailyCalorieTarget()).isEqualTo(1650);
        assertThat(user.getGoalCalorieDelta()).isEqualTo(-350);
        assertThat(user.getGoalMode()).isEqualTo(GoalMode.LOSE);
        verify(userProfileRepository).update(user);
    }

    @Test
    void shouldCreateWeightRecordWithoutSyncCurrentWeightWhenRecordDateIsHistory() {
        UserProfile user = buildUser(1L, new BigDecimal("62.00"));
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(user));
        doAnswer(invocation -> {
            BodyMetricRecord record = invocation.getArgument(0);
            record.setId(101L);
            return null;
        }).when(bodyMetricRecordRepository).save(any(BodyMetricRecord.class));

        bodyMetricRecordService.create(
                1L,
                new CreateBodyMetricRecordRequest(
                        null,
                        BodyMetricType.WEIGHT,
                        new BigDecimal("60.80"),
                        BodyMetricUnit.KG,
                        LocalDate.now().minusDays(1)
                )
        );

        assertThat(user.getCurrentWeight()).isEqualByComparingTo("62.00");
        verify(userProfileRepository, never()).update(any(UserProfile.class));
    }

    @Test
    void shouldAllowMultipleWeightRecordsInSameDay() {
        UserProfile user = buildUser(1L, new BigDecimal("62.00"));
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(user));

        bodyMetricRecordService.create(
                1L,
                new CreateBodyMetricRecordRequest(
                        null,
                        BodyMetricType.WEIGHT,
                        new BigDecimal("61.50"),
                        BodyMetricUnit.KG,
                        LocalDate.now()
                )
        );
        bodyMetricRecordService.create(
                1L,
                new CreateBodyMetricRecordRequest(
                        null,
                        BodyMetricType.WEIGHT,
                        new BigDecimal("61.20"),
                        BodyMetricUnit.KG,
                        LocalDate.now()
                )
        );

        verify(bodyMetricRecordRepository, times(2)).save(any(BodyMetricRecord.class));
    }

    @Test
    void shouldRejectWhenWeightUnitIsNotKg() {
        UserProfile user = buildUser(1L, new BigDecimal("62.00"));
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> bodyMetricRecordService.create(
                1L,
                new CreateBodyMetricRecordRequest(
                        null,
                        BodyMetricType.WEIGHT,
                        new BigDecimal("61.50"),
                        BodyMetricUnit.CM,
                        LocalDate.now()
                )
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("weight metric must use KG");
    }

    @Test
    void shouldCreateCircumferenceRecordWhenUnitIsCm() {
        UserProfile user = buildUser(1L, new BigDecimal("62.00"));
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(user));

        bodyMetricRecordService.create(
                1L,
                new CreateBodyMetricRecordRequest(
                        null,
                        BodyMetricType.WAIST_CIRCUMFERENCE,
                        new BigDecimal("75.20"),
                        BodyMetricUnit.CM,
                        LocalDate.now()
                )
        );

        verify(bodyMetricRecordRepository).save(any(BodyMetricRecord.class));
        verify(userProfileRepository, never()).update(any(UserProfile.class));
    }

    @Test
    void shouldRejectWhenCircumferenceUnitIsNotCm() {
        UserProfile user = buildUser(1L, new BigDecimal("62.00"));
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> bodyMetricRecordService.create(
                1L,
                new CreateBodyMetricRecordRequest(
                        null,
                        BodyMetricType.WAIST_CIRCUMFERENCE,
                        new BigDecimal("75.20"),
                        BodyMetricUnit.KG,
                        LocalDate.now()
                )
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("circumference metric must use CM");
    }

    @Test
    void shouldBuildSnapshotWithBmiFromLatestWeight() {
        UserProfile user = buildUser(1L, new BigDecimal("62.00"));
        user.setHeight(new BigDecimal("170.00"));
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(user));

        BodyMetricRecord latestWeight = buildRecord(10L, BodyMetricType.WEIGHT, new BigDecimal("60.00"), LocalDate.of(2026, 3, 15));
        when(bodyMetricRecordRepository.findLatestByMetricType(1L, BodyMetricType.WEIGHT)).thenReturn(Optional.of(latestWeight));
        when(bodyMetricRecordRepository.findLatestByMetricType(1L, BodyMetricType.CHEST_CIRCUMFERENCE)).thenReturn(Optional.empty());
        when(bodyMetricRecordRepository.findLatestByMetricType(1L, BodyMetricType.WAIST_CIRCUMFERENCE)).thenReturn(Optional.empty());
        when(bodyMetricRecordRepository.findLatestByMetricType(1L, BodyMetricType.HIP_CIRCUMFERENCE)).thenReturn(Optional.empty());
        when(bodyMetricRecordRepository.findLatestByMetricType(1L, BodyMetricType.THIGH_CIRCUMFERENCE)).thenReturn(Optional.empty());

        BodyMetricSnapshotResponse response = bodyMetricRecordService.getSnapshot(1L);

        assertThat(response.items()).hasSize(6);
        assertThat(response.items())
                .anyMatch(item -> item.metricKey() == BodyMetricTrendMetricKey.WEIGHT
                        && item.latestValue().compareTo(new BigDecimal("60.00")) == 0
                        && item.latestRecordDate().equals(LocalDate.of(2026, 3, 15)));
        assertThat(response.items())
                .anyMatch(item -> item.metricKey() == BodyMetricTrendMetricKey.BMI
                        && item.latestValue().compareTo(new BigDecimal("20.76")) == 0
                        && item.latestRecordDate().equals(LocalDate.of(2026, 3, 15)));
    }

    @Test
    void shouldReturnHistoryRecordsWithMultipleItemsInSameDay() {
        UserProfile user = buildUser(1L, new BigDecimal("62.00"));
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(user));

        List<BodyMetricRecord> records = List.of(
                buildRecord(15L, BodyMetricType.WEIGHT, new BigDecimal("60.80"), LocalDate.of(2026, 3, 15), LocalDateTime.of(2026, 3, 15, 20, 10)),
                buildRecord(14L, BodyMetricType.WEIGHT, new BigDecimal("61.20"), LocalDate.of(2026, 3, 15), LocalDateTime.of(2026, 3, 15, 7, 30)),
                buildRecord(13L, BodyMetricType.WEIGHT, new BigDecimal("61.50"), LocalDate.of(2026, 3, 14), LocalDateTime.of(2026, 3, 14, 8, 0))
        );
        when(bodyMetricRecordRepository.findByMetricTypeWithCursor(
                1L,
                BodyMetricType.WEIGHT,
                null,
                null,
                3
        )).thenReturn(records);

        BodyMetricHistoryResponse response = bodyMetricRecordService.getHistory(
                1L,
                BodyMetricTrendMetricKey.WEIGHT,
                null,
                null,
                2
        );

        assertThat(response.hasMore()).isTrue();
        assertThat(response.nextCursorDate()).isEqualTo(LocalDate.of(2026, 3, 15));
        assertThat(response.nextCursorId()).isEqualTo(14L);
        assertThat(response.records()).hasSize(2);
        assertThat(response.records().get(0).id()).isEqualTo(15L);
        assertThat(response.records().get(0).recordDate()).isEqualTo(LocalDate.of(2026, 3, 15));
        assertThat(response.records().get(0).createdAt()).isEqualTo(LocalDateTime.of(2026, 3, 15, 20, 10));
        assertThat(response.records().get(1).id()).isEqualTo(14L);
        assertThat(response.records().get(1).recordDate()).isEqualTo(LocalDate.of(2026, 3, 15));
    }

    @Test
    void shouldReturnAllTrendWithCursorAndBmiCalculation() {
        UserProfile user = buildUser(1L, new BigDecimal("62.00"));
        user.setHeight(new BigDecimal("170.00"));
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(user));

        List<BodyMetricRecord> records = List.of(
                buildRecord(15L, BodyMetricType.WEIGHT, new BigDecimal("60.00"), LocalDate.of(2026, 3, 15)),
                buildRecord(14L, BodyMetricType.WEIGHT, new BigDecimal("61.00"), LocalDate.of(2026, 3, 14)),
                buildRecord(13L, BodyMetricType.WEIGHT, new BigDecimal("62.00"), LocalDate.of(2026, 3, 13))
        );
        when(bodyMetricRecordRepository.findDailyLatestByMetricTypeWithCursor(
                1L,
                BodyMetricType.WEIGHT,
                null,
                null,
                3
        )).thenReturn(records);

        BodyMetricTrendResponse response = bodyMetricRecordService.getTrend(
                1L,
                BodyMetricTrendMetricKey.BMI,
                MetricTrendRangeType.ALL,
                null,
                null,
                2
        );

        assertThat(response.hasMore()).isTrue();
        assertThat(response.nextCursorDate()).isEqualTo(LocalDate.of(2026, 3, 14));
        assertThat(response.nextCursorId()).isEqualTo(14L);
        assertThat(response.points()).hasSize(2);
        assertThat(response.points().get(0).date()).isEqualTo(LocalDate.of(2026, 3, 14));
        assertThat(response.points().get(0).value()).isEqualByComparingTo("21.11");
        assertThat(response.points().get(1).date()).isEqualTo(LocalDate.of(2026, 3, 15));
        assertThat(response.points().get(1).value()).isEqualByComparingTo("20.76");
    }

    @Test
    void shouldReturnTrendUsingLatestRecordOfSameDay() {
        UserProfile user = buildUser(1L, new BigDecimal("62.00"));
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(user));

        List<BodyMetricRecord> records = List.of(
                buildRecord(21L, BodyMetricType.WEIGHT, new BigDecimal("60.60"), LocalDate.of(2026, 3, 15), LocalDateTime.of(2026, 3, 15, 20, 0)),
                buildRecord(19L, BodyMetricType.WEIGHT, new BigDecimal("61.10"), LocalDate.of(2026, 3, 14), LocalDateTime.of(2026, 3, 14, 8, 0))
        );
        when(bodyMetricRecordRepository.findDailyLatestByMetricTypeWithCursor(
                1L,
                BodyMetricType.WEIGHT,
                null,
                null,
                121
        )).thenReturn(records);

        BodyMetricTrendResponse response = bodyMetricRecordService.getTrend(
                1L,
                BodyMetricTrendMetricKey.WEIGHT,
                MetricTrendRangeType.ALL,
                null,
                null,
                120
        );

        assertThat(response.points()).hasSize(2);
        assertThat(response.points().get(0).date()).isEqualTo(LocalDate.of(2026, 3, 14));
        assertThat(response.points().get(0).value()).isEqualByComparingTo("61.10");
        assertThat(response.points().get(1).date()).isEqualTo(LocalDate.of(2026, 3, 15));
        assertThat(response.points().get(1).value()).isEqualByComparingTo("60.60");
    }

    @Test
    void shouldRejectWhenAllRangeCursorIsIncomplete() {
        UserProfile user = buildUser(1L, new BigDecimal("62.00"));
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> bodyMetricRecordService.getTrend(
                1L,
                BodyMetricTrendMetricKey.WEIGHT,
                MetricTrendRangeType.ALL,
                LocalDate.of(2026, 3, 10),
                null,
                120
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("cursorDate and cursorId must be provided together");
    }

    @Test
    void shouldDeleteOwnedBodyMetricRecord() {
        UserProfile user = buildUser(1L, new BigDecimal("62.00"));
        BodyMetricRecord existing = buildRecord(21L, BodyMetricType.WAIST_CIRCUMFERENCE, new BigDecimal("75.20"), LocalDate.of(2026, 3, 15));
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(user));
        when(bodyMetricRecordRepository.findByIdAndUserId(21L, 1L)).thenReturn(Optional.of(existing));

        BodyMetricDeleteResponse response = bodyMetricRecordService.delete(1L, 21L);

        assertThat(response.deleted()).isTrue();
        verify(bodyMetricRecordRepository).deleteById(21L);
        verify(userProfileRepository, never()).update(any(UserProfile.class));
    }

    @Test
    void shouldSeedInitialWeightRecordOnlyWhenHistoryMissing() {
        when(bodyMetricRecordRepository.findLatestByMetricType(1L, BodyMetricType.WEIGHT)).thenReturn(Optional.empty());

        bodyMetricRecordService.seedInitialWeightRecord(1L, new BigDecimal("60.80"), LocalDate.of(2026, 3, 15));

        verify(bodyMetricRecordRepository).save(any(BodyMetricRecord.class));
    }

    @Test
    void shouldSkipSeedInitialWeightRecordWhenWeightHistoryExists() {
        when(bodyMetricRecordRepository.findLatestByMetricType(1L, BodyMetricType.WEIGHT))
                .thenReturn(Optional.of(buildRecord(11L, BodyMetricType.WEIGHT, new BigDecimal("61.00"), LocalDate.of(2026, 3, 14))));

        bodyMetricRecordService.seedInitialWeightRecord(1L, new BigDecimal("60.80"), LocalDate.of(2026, 3, 15));

        verify(bodyMetricRecordRepository, never()).save(any(BodyMetricRecord.class));
    }

    private UserProfile buildUser(Long id, BigDecimal currentWeight) {
        UserProfile user = new UserProfile();
        user.setId(id);
        user.setCurrentWeight(currentWeight);
        return user;
    }

    private BodyMetricRecord buildRecord(Long id, BodyMetricType metricType, BigDecimal metricValue, LocalDate recordDate) {
        return buildRecord(id, metricType, metricValue, recordDate, LocalDateTime.of(recordDate.getYear(), recordDate.getMonth(), recordDate.getDayOfMonth(), 8, 0));
    }

    private BodyMetricRecord buildRecord(
            Long id,
            BodyMetricType metricType,
            BigDecimal metricValue,
            LocalDate recordDate,
            LocalDateTime createdAt
    ) {
        BodyMetricRecord record = new BodyMetricRecord();
        record.setId(id);
        record.setMetricType(metricType);
        record.setMetricValue(metricValue);
        record.setRecordDate(recordDate);
        record.setCreatedAt(createdAt);
        record.setUnit(metricType == BodyMetricType.WEIGHT ? BodyMetricUnit.KG : BodyMetricUnit.CM);
        return record;
    }
}
