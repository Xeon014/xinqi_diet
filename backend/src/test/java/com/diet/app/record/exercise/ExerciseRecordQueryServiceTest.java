package com.diet.app.record.exercise;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.diet.domain.exercise.Exercise;
import com.diet.domain.exercise.ExerciseIntensity;
import com.diet.domain.exercise.ExerciseRecord;
import com.diet.domain.exercise.ExerciseRecordRepository;
import com.diet.domain.exercise.ExerciseRepository;
import com.diet.domain.user.UserProfileRepository;
import com.diet.api.exercise.ExerciseRecordHistoryResponse;
import com.diet.api.exercise.ExerciseRecordResponse;
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
class ExerciseRecordQueryServiceTest {

    @Mock
    private ExerciseRecordRepository exerciseRecordRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private ExerciseRepository exerciseRepository;

    private ExerciseRecordQueryService exerciseRecordQueryService;

    @BeforeEach
    void setUp() {
        ExerciseRecordSupport exerciseRecordSupport = new ExerciseRecordSupport(
                exerciseRecordRepository,
                userProfileRepository,
                exerciseRepository
        );
        exerciseRecordQueryService = new ExerciseRecordQueryService(exerciseRecordRepository, exerciseRecordSupport);
    }

    @Test
    void shouldReturnOwnedExerciseRecordById() {
        Long userId = 1L;
        Long recordId = 101L;
        ExerciseRecord record = buildRecord(recordId, userId, 301L, "2026-04-01", "2026-04-01T20:30:00");
        Exercise exercise = buildExercise(301L, "跑步");

        when(exerciseRecordRepository.findById(recordId)).thenReturn(Optional.of(record));
        when(exerciseRepository.findAccessibleById(userId, exercise.getId())).thenReturn(Optional.of(exercise));

        ExerciseRecordResponse response = exerciseRecordQueryService.getById(userId, recordId);

        assertThat(response.id()).isEqualTo(recordId);
        assertThat(response.exerciseId()).isEqualTo(301L);
        assertThat(response.exerciseName()).isEqualTo("跑步");
        assertThat(response.durationMinutes()).isEqualTo(30);
    }

    @Test
    void shouldReturnExerciseHistoryPageWithNextCursor() {
        Long userId = 1L;
        ExerciseRecord latest = buildRecord(101L, userId, 301L, "2026-04-02", "2026-04-02T20:10:00");
        ExerciseRecord older = buildRecord(102L, userId, 302L, "2026-04-01", "2026-04-01T19:50:00");
        ExerciseRecord extra = buildRecord(103L, userId, 303L, "2026-03-31", "2026-03-31T19:10:00");

        when(exerciseRecordRepository.findByUserWithCursor(userId, null, null, null, 3))
                .thenReturn(List.of(latest, older, extra));
        when(exerciseRepository.findAccessibleById(userId, 301L)).thenReturn(Optional.of(buildExercise(301L, "跑步")));
        when(exerciseRepository.findAccessibleById(userId, 302L)).thenReturn(Optional.of(buildExercise(302L, "跳绳")));

        ExerciseRecordHistoryResponse response = exerciseRecordQueryService.getHistory(
                userId,
                null,
                null,
                null,
                2
        );

        assertThat(response.records()).hasSize(2);
        assertThat(response.records().get(0).exerciseName()).isEqualTo("跑步");
        assertThat(response.records().get(1).exerciseName()).isEqualTo("跳绳");
        assertThat(response.hasMore()).isTrue();
        assertThat(response.nextCursorRecordDate()).isEqualTo(LocalDate.of(2026, 4, 1));
        assertThat(response.nextCursorCreatedAt()).isEqualTo(LocalDateTime.of(2026, 4, 1, 19, 50));
        assertThat(response.nextCursorId()).isEqualTo(102L);
    }

    private Exercise buildExercise(Long exerciseId, String name) {
        Exercise exercise = new Exercise(null, name, new BigDecimal("8.8"), "CARDIO");
        exercise.setId(exerciseId);
        return exercise;
    }

    private ExerciseRecord buildRecord(
            Long recordId,
            Long userId,
            Long exerciseId,
            String recordDate,
            String createdAt
    ) {
        ExerciseRecord record = new ExerciseRecord(
                userId,
                exerciseId,
                30,
                ExerciseIntensity.MEDIUM,
                ExerciseIntensity.MEDIUM.factor(),
                new BigDecimal("60.00"),
                new BigDecimal("264.00"),
                LocalDate.parse(recordDate)
        );
        record.setId(recordId);
        record.setCreatedAt(LocalDateTime.parse(createdAt));
        return record;
    }
}
