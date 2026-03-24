package com.diet.app.exercise;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.diet.types.common.ConflictException;
import com.diet.types.common.NotFoundException;
import com.diet.domain.exercise.Exercise;
import com.diet.domain.exercise.ExerciseRecordRepository;
import com.diet.domain.exercise.ExerciseRepository;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.api.exercise.CreateExerciseRequest;
import com.diet.api.exercise.ExerciseResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ExerciseServiceTest {

    @Mock
    private ExerciseRepository exerciseRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private ExerciseRecordRepository exerciseRecordRepository;

    private ExerciseService exerciseService;

    @BeforeEach
    void setUp() {
        exerciseService = new ExerciseService(
                exerciseRepository,
                userProfileRepository,
                exerciseRecordRepository
        );
    }

    @Test
    void shouldCreateCustomExerciseForCurrentUser() {
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(buildUser(1L)));
        when(exerciseRepository.findByAccessibleNameIgnoreCase(1L, "室内骑行")).thenReturn(Optional.empty());
        doAnswer(invocation -> {
            Exercise exercise = invocation.getArgument(0);
            exercise.setId(20L);
            return null;
        }).when(exerciseRepository).save(any(Exercise.class));

        ExerciseResponse response = exerciseService.create(
                1L,
                new CreateExerciseRequest("  室内骑行  ", new BigDecimal("6.8"), "CARDIO")
        );

        assertThat(response.id()).isEqualTo(20L);
        assertThat(response.userId()).isEqualTo(1L);
        assertThat(response.name()).isEqualTo("室内骑行");
        assertThat(response.category()).isEqualTo("CARDIO");
        assertThat(response.isBuiltin()).isFalse();
    }

    @Test
    void shouldOnlyReturnOwnedCustomExercisesWhenScopeIsCustom() {
        when(exerciseRepository.findCustomByUser(1L, "骑行", "CARDIO"))
                .thenReturn(List.of(buildCustomExercise(20L, 1L, "室内骑行")));

        List<ExerciseResponse> responses = exerciseService.findAll(1L, "骑行", "CARDIO", ExerciseService.SCOPE_CUSTOM);

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).name()).isEqualTo("室内骑行");
        verify(exerciseRepository, never()).findAll(any(), any(), any());
    }

    @Test
    void shouldRejectDeleteWhenExerciseUsedByExerciseRecord() {
        Exercise exercise = buildCustomExercise(88L, 1L, "弹力带训练");
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(buildUser(1L)));
        when(exerciseRepository.findOwnedCustomById(1L, 88L)).thenReturn(Optional.of(exercise));
        when(exerciseRecordRepository.countByExerciseId(88L)).thenReturn(1L);

        assertThatThrownBy(() -> exerciseService.delete(1L, 88L))
                .isInstanceOf(ConflictException.class)
                .hasMessage("该运动已被运动记录使用，无法删除");

        verify(exerciseRepository, never()).deleteById(any(Long.class));
    }

    @Test
    void shouldReturnNotFoundWhenDeletingNonOwnedExercise() {
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(buildUser(1L)));
        when(exerciseRepository.findOwnedCustomById(1L, 88L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> exerciseService.delete(1L, 88L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("exercise not found, id=88");
    }

    private UserProfile buildUser(Long userId) {
        UserProfile user = new UserProfile();
        user.setId(userId);
        return user;
    }

    private Exercise buildCustomExercise(Long exerciseId, Long userId, String name) {
        Exercise exercise = new Exercise(userId, name, new BigDecimal("5.5"), "STRENGTH");
        exercise.setId(exerciseId);
        return exercise;
    }
}
