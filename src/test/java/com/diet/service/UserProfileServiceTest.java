package com.diet.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.diet.domain.exercise.ExerciseRecordRepository;
import com.diet.domain.exercise.ExerciseRepository;
import com.diet.domain.food.FoodRepository;
import com.diet.domain.record.MealRecordRepository;
import com.diet.domain.user.ActivityLevel;
import com.diet.domain.user.Gender;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.user.CreateUserRequest;
import com.diet.dto.user.UpdateUserRequest;
import com.diet.dto.user.UserResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UserProfileServiceTest {

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private MealRecordRepository mealRecordRepository;

    @Mock
    private FoodRepository foodRepository;

    @Mock
    private ExerciseRecordRepository exerciseRecordRepository;

    @Mock
    private ExerciseRepository exerciseRepository;

    @InjectMocks
    private UserProfileService userProfileService;

    @Test
    void shouldKeepNameWhenUpdateNameIsNull() {
        UserProfile existing = buildUser("已存在昵称");
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(existing));

        UpdateUserRequest request = new UpdateUserRequest(
                null,
                existing.getGender(),
                existing.getBirthDate(),
                existing.getHeight(),
                existing.getActivityLevel(),
                existing.getDailyCalorieTarget(),
                existing.getCurrentWeight(),
                existing.getTargetWeight(),
                existing.getCustomBmr(),
                null
        );

        UserResponse response = userProfileService.update(1L, request);

        assertThat(response.name()).isEqualTo("已存在昵称");
        verify(userProfileRepository).update(existing);
    }

    @Test
    void shouldRejectBlankNameWhenUpdate() {
        UserProfile existing = buildUser("旧昵称");
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(existing));

        UpdateUserRequest request = new UpdateUserRequest(
                "   ",
                existing.getGender(),
                existing.getBirthDate(),
                existing.getHeight(),
                existing.getActivityLevel(),
                existing.getDailyCalorieTarget(),
                existing.getCurrentWeight(),
                existing.getTargetWeight(),
                existing.getCustomBmr(),
                null
        );

        assertThatThrownBy(() -> userProfileService.update(1L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("name must not be blank");
        verify(userProfileRepository, never()).update(any(UserProfile.class));
    }

    @Test
    void shouldRejectTooLongNameWhenUpdate() {
        UserProfile existing = buildUser("旧昵称");
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(existing));

        UpdateUserRequest request = new UpdateUserRequest(
                "这是一个超过二十个字符长度的昵称测试A",
                existing.getGender(),
                existing.getBirthDate(),
                existing.getHeight(),
                existing.getActivityLevel(),
                existing.getDailyCalorieTarget(),
                existing.getCurrentWeight(),
                existing.getTargetWeight(),
                existing.getCustomBmr(),
                null
        );

        assertThatThrownBy(() -> userProfileService.update(1L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("name length must be less than or equal to 20");
        verify(userProfileRepository, never()).update(any(UserProfile.class));
    }

    @Test
    void shouldKeepNameNullWhenCreateNameBlank() {
        doAnswer(invocation -> {
            UserProfile user = invocation.getArgument(0);
            user.setId(10L);
            return null;
        }).when(userProfileRepository).save(any(UserProfile.class));

        CreateUserRequest request = new CreateUserRequest(
                "   ",
                Gender.FEMALE,
                LocalDate.of(2000, 1, 1),
                new BigDecimal("165.00"),
                ActivityLevel.LIGHT,
                1800,
                new BigDecimal("60.00"),
                new BigDecimal("55.00"),
                null
        );

        UserResponse response = userProfileService.create(request);

        assertThat(response.name()).isNull();
    }

    @Test
    void shouldClearCustomBmrWhenUseFormulaBmrIsTrue() {
        UserProfile existing = buildUser("旧昵称");
        existing.setCustomBmr(1400);
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(existing));

        UpdateUserRequest request = new UpdateUserRequest(
                null,
                existing.getGender(),
                existing.getBirthDate(),
                existing.getHeight(),
                existing.getActivityLevel(),
                existing.getDailyCalorieTarget(),
                existing.getCurrentWeight(),
                existing.getTargetWeight(),
                null,
                true
        );

        UserResponse response = userProfileService.update(1L, request);

        assertThat(response.customBmr()).isNull();
        verify(userProfileRepository).update(existing);
    }

    private UserProfile buildUser(String name) {
        UserProfile user = new UserProfile(
                name,
                Gender.FEMALE,
                LocalDate.of(2000, 1, 1),
                new BigDecimal("165.00"),
                ActivityLevel.LIGHT,
                1800,
                new BigDecimal("60.00"),
                new BigDecimal("55.00"),
                null
        );
        user.setId(1L);
        return user;
    }
}
