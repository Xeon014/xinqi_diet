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
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.metric.BodyMetricRecordResponse;
import com.diet.dto.metric.CreateBodyMetricRecordRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
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

    private BodyMetricRecordService bodyMetricRecordService;

    @BeforeEach
    void setUp() {
        bodyMetricRecordService = new BodyMetricRecordService(bodyMetricRecordRepository, userProfileRepository);
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

    private UserProfile buildUser(Long id, BigDecimal currentWeight) {
        UserProfile user = new UserProfile();
        user.setId(id);
        user.setCurrentWeight(currentWeight);
        return user;
    }
}
