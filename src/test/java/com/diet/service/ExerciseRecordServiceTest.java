package com.diet.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.diet.domain.exercise.Exercise;
import com.diet.domain.exercise.ExerciseIntensity;
import com.diet.domain.exercise.ExerciseRecord;
import com.diet.domain.exercise.ExerciseRecordRepository;
import com.diet.domain.exercise.ExerciseRepository;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.exercise.ExerciseRecordResponse;
import com.diet.dto.exercise.UpdateExerciseRecordRequest;
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
class ExerciseRecordServiceTest {

    @Mock
    private ExerciseRecordRepository exerciseRecordRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private ExerciseRepository exerciseRepository;

    private ExerciseRecordService exerciseRecordService;

    @BeforeEach
    void setUp() {
        exerciseRecordService = new ExerciseRecordService(
                exerciseRecordRepository,
                userProfileRepository,
                exerciseRepository
        );
    }

    @Test
    void shouldUpdateDurationIntensityAndRecordDate() {
        Long userId = 1L;
        Long recordId = 12L;
        Exercise exercise = buildExercise(101L, "跑步");
        ExerciseRecord record = buildRecord(recordId, userId, exercise.getId());

        when(userProfileRepository.findById(userId)).thenReturn(Optional.of(buildUser(userId)));
        when(exerciseRecordRepository.findById(recordId)).thenReturn(Optional.of(record));
        when(exerciseRepository.findById(exercise.getId())).thenReturn(Optional.of(exercise));

        ExerciseRecordResponse response = exerciseRecordService.update(
                userId,
                recordId,
                new UpdateExerciseRecordRequest(
                        45,
                        ExerciseIntensity.HIGH,
                        LocalDate.of(2026, 3, 16)
                )
        );

        assertThat(response.durationMinutes()).isEqualTo(45);
        assertThat(response.intensityLevel()).isEqualTo(ExerciseIntensity.HIGH);
        assertThat(response.recordDate()).isEqualTo(LocalDate.of(2026, 3, 16));
        assertThat(response.totalCalories()).isEqualByComparingTo("594.00");
        assertThat(record.getDurationMinutes()).isEqualTo(45);
        assertThat(record.getIntensityLevel()).isEqualTo(ExerciseIntensity.HIGH);
        assertThat(record.getRecordDate()).isEqualTo(LocalDate.of(2026, 3, 16));
        assertThat(record.getTotalCalories()).isEqualByComparingTo("594.00");
        verify(exerciseRecordRepository).save(record);
    }

    private UserProfile buildUser(Long userId) {
        UserProfile user = new UserProfile();
        user.setId(userId);
        return user;
    }

    private Exercise buildExercise(Long exerciseId, String name) {
        Exercise exercise = new Exercise(null, name, new BigDecimal("8.8"), "CARDIO");
        exercise.setId(exerciseId);
        return exercise;
    }

    private ExerciseRecord buildRecord(Long recordId, Long userId, Long exerciseId) {
        ExerciseRecord record = new ExerciseRecord(
                userId,
                exerciseId,
                30,
                ExerciseIntensity.MEDIUM,
                ExerciseIntensity.MEDIUM.factor(),
                new BigDecimal("75.00"),
                new BigDecimal("330.00"),
                LocalDate.of(2026, 3, 14)
        );
        record.setId(recordId);
        record.setCreatedAt(LocalDateTime.of(2026, 3, 14, 20, 0));
        return record;
    }
}
