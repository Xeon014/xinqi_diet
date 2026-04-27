package com.diet.app.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.diet.domain.metric.BodyMetricRecord;
import com.diet.domain.metric.BodyMetricRecordRepository;
import com.diet.domain.metric.BodyMetricType;
import com.diet.domain.metric.BodyMetricUnit;
import com.diet.domain.user.ActivityLevel;
import com.diet.domain.user.Gender;
import com.diet.domain.user.GoalCalorieStrategy;
import com.diet.domain.user.GoalMode;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.api.user.CreateUserRequest;
import com.diet.api.user.UpdateUserRequest;
import com.diet.api.user.UserResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.diet.app.metric.BodyMetricRecordCommandService;
@ExtendWith(MockitoExtension.class)
class UserProfileApplicationServiceTest {

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private BodyMetricRecordRepository bodyMetricRecordRepository;

    private UserProfileApplicationService userProfileApplicationService;

    @BeforeEach
    void setUp() {
        GoalPlanningService goalPlanningService = new GoalPlanningService(bodyMetricRecordRepository);
        BodyMetricRecordCommandService bodyMetricRecordCommandService = new BodyMetricRecordCommandService(
                bodyMetricRecordRepository,
                userProfileRepository,
                goalPlanningService
        );
        UserProfileSupport userProfileSupport = new UserProfileSupport(userProfileRepository, goalPlanningService);
        userProfileApplicationService = new UserProfileApplicationService(
                userProfileRepository,
                goalPlanningService,
                bodyMetricRecordCommandService,
                userProfileSupport
        );
    }

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
                existing.getCustomTdee(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        UserResponse response = userProfileApplicationService.update(1L, request);

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
                existing.getCustomTdee(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        assertThatThrownBy(() -> userProfileApplicationService.update(1L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("name must not be blank");
        verify(userProfileRepository, never()).update(any(UserProfile.class));
    }

    @Test
    void shouldRejectTooLongNameWhenUpdate() {
        UserProfile existing = buildUser("旧昵称");
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(existing));

        UpdateUserRequest request = new UpdateUserRequest(
                "123456789012345678901",
                existing.getGender(),
                existing.getBirthDate(),
                existing.getHeight(),
                existing.getActivityLevel(),
                existing.getDailyCalorieTarget(),
                existing.getCurrentWeight(),
                existing.getTargetWeight(),
                existing.getCustomBmr(),
                existing.getCustomTdee(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        assertThatThrownBy(() -> userProfileApplicationService.update(1L, request))
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
                null,
                null,
                null,
                null,
                null,
                null,
                GoalCalorieStrategy.MANUAL
        );

        UserResponse response = userProfileApplicationService.create(request);

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
                existing.getCustomTdee(),
                null,
                null,
                null,
                null,
                null,
                null,
                true,
                null
        );

        UserResponse response = userProfileApplicationService.update(1L, request);

        assertThat(response.customBmr()).isNull();
        verify(userProfileRepository).update(existing);
    }

    @Test
    void shouldUseCustomTdeeAsEffectiveTargetCalories() {
        UserProfile existing = buildUser("旧昵称");
        existing.setCustomBmr(1400);
        existing.setCustomTdee(1980);
        existing.setGoalMode(GoalMode.MAINTAIN);
        existing.setGoalCalorieDelta(0);
        existing.setDailyCalorieTarget(1600);
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(existing));

        UserResponse response = userProfileApplicationService.findById(1L);

        assertThat(response.customTdee()).isEqualTo(1980);
        assertThat(response.tdee()).isEqualByComparingTo("1980.00");
        assertThat(response.dailyCalorieTarget()).isEqualTo(1980);
    }

    @Test
    void shouldEstimateTdeeFromBmrWhenCustomTdeeMissing() {
        UserProfile existing = buildUser("旧昵称");
        existing.setCustomBmr(1400);
        existing.setCustomTdee(null);
        existing.setGoalMode(GoalMode.MAINTAIN);
        existing.setGoalCalorieDelta(0);
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(existing));

        UserResponse response = userProfileApplicationService.findById(1L);

        assertThat(response.tdee()).isEqualByComparingTo("2000.00");
        assertThat(response.dailyCalorieTarget()).isEqualTo(2000);
    }

    @Test
    void shouldResolveAutoProteinTargetFromCurrentWeight() {
        UserProfile existing = buildUser("旧昵称");
        existing.setCustomProteinTarget(null);
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(existing));

        UserResponse response = userProfileApplicationService.findById(1L);

        assertThat(response.proteinTarget()).isEqualTo(108);
        assertThat(response.customProteinTarget()).isNull();
    }

    @Test
    void shouldClearCustomProteinTargetWhenUseAutoProteinTargetIsTrue() {
        UserProfile existing = buildUser("旧昵称");
        existing.setCustomProteinTarget(130);
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
                existing.getCustomTdee(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                true
        );

        UserResponse response = userProfileApplicationService.update(1L, request);

        assertThat(response.customProteinTarget()).isNull();
        assertThat(response.proteinTarget()).isEqualTo(108);
        verify(userProfileRepository).update(existing);
    }

    @Test
    void shouldDeriveGoalDeltaFromCompatibleDailyTargetWhenUpdateCustomTdee() {
        UserProfile existing = buildUser("旧昵称");
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(existing));

        UpdateUserRequest request = new UpdateUserRequest(
                null,
                existing.getGender(),
                existing.getBirthDate(),
                existing.getHeight(),
                existing.getActivityLevel(),
                1500,
                existing.getCurrentWeight(),
                existing.getTargetWeight(),
                existing.getCustomBmr(),
                2100,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        UserResponse response = userProfileApplicationService.update(1L, request);

        assertThat(response.tdee()).isEqualByComparingTo("2100.00");
        assertThat(response.dailyCalorieTarget()).isEqualTo(1500);
        assertThat(response.goalCalorieDelta()).isEqualTo(-600);
        assertThat(existing.getDailyCalorieTarget()).isEqualTo(1500);
        assertThat(existing.getGoalCalorieDelta()).isEqualTo(-600);
    }

    @Test
    void shouldApplyGoalDeltaToCalculatedTargetCalories() {
        UserProfile existing = buildUser("旧昵称");
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(existing));

        UpdateUserRequest request = new UpdateUserRequest(
                null,
                existing.getGender(),
                existing.getBirthDate(),
                existing.getHeight(),
                existing.getActivityLevel(),
                null,
                existing.getCurrentWeight(),
                existing.getTargetWeight(),
                existing.getCustomBmr(),
                2100,
                null,
                GoalMode.LOSE,
                -300,
                null,
                null,
                null,
                null,
                null
        );

        UserResponse response = userProfileApplicationService.update(1L, request);

        assertThat(response.tdee()).isEqualByComparingTo("2100.00");
        assertThat(response.goalMode()).isEqualTo(GoalMode.LOSE);
        assertThat(response.goalCalorieDelta()).isEqualTo(-300);
        assertThat(response.dailyCalorieTarget()).isEqualTo(1800);
    }

    @Test
    void shouldUseGoalModeDefaultDeltaWhenGoalModeProvidedWithoutDelta() {
        UserProfile existing = buildUser("旧昵称");
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(existing));

        UpdateUserRequest request = new UpdateUserRequest(
                null,
                existing.getGender(),
                existing.getBirthDate(),
                existing.getHeight(),
                existing.getActivityLevel(),
                null,
                existing.getCurrentWeight(),
                existing.getTargetWeight(),
                existing.getCustomBmr(),
                2100,
                null,
                GoalMode.GAIN,
                null,
                null,
                null,
                null,
                null,
                null
        );

        UserResponse response = userProfileApplicationService.update(1L, request);

        assertThat(response.goalMode()).isEqualTo(GoalMode.GAIN);
        assertThat(response.goalCalorieDelta()).isEqualTo(300);
        assertThat(response.dailyCalorieTarget()).isEqualTo(2400);
    }

    @Test
    void shouldSeedInitialWeightRecordWhenRequestedAndNoWeightHistory() {
        UserProfile existing = buildUser("旧昵称");
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(bodyMetricRecordRepository.findLatestByMetricType(1L, BodyMetricType.WEIGHT)).thenReturn(Optional.empty());

        UpdateUserRequest request = new UpdateUserRequest(
                null,
                existing.getGender(),
                existing.getBirthDate(),
                existing.getHeight(),
                existing.getActivityLevel(),
                existing.getDailyCalorieTarget(),
                new BigDecimal("59.50"),
                existing.getTargetWeight(),
                existing.getCustomBmr(),
                existing.getCustomTdee(),
                null,
                null,
                null,
                null,
                null,
                true,
                null,
                null
        );

        userProfileApplicationService.update(1L, request);

        verify(bodyMetricRecordRepository).save(any(BodyMetricRecord.class));
    }

    @Test
    void shouldNotSeedInitialWeightRecordWhenWeightHistoryExists() {
        UserProfile existing = buildUser("旧昵称");
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(bodyMetricRecordRepository.findLatestByMetricType(1L, BodyMetricType.WEIGHT))
                .thenReturn(Optional.of(buildWeightRecord(8L, new BigDecimal("60.00"))));

        UpdateUserRequest request = new UpdateUserRequest(
                null,
                existing.getGender(),
                existing.getBirthDate(),
                existing.getHeight(),
                existing.getActivityLevel(),
                existing.getDailyCalorieTarget(),
                new BigDecimal("59.50"),
                existing.getTargetWeight(),
                existing.getCustomBmr(),
                existing.getCustomTdee(),
                null,
                null,
                null,
                null,
                null,
                true,
                null,
                null
        );

        userProfileApplicationService.update(1L, request);

        verify(bodyMetricRecordRepository, never()).save(any(BodyMetricRecord.class));
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
                null,
                null,
                null,
                null,
                null,
                GoalCalorieStrategy.MANUAL
        );
        user.setId(1L);
        return user;
    }

    private BodyMetricRecord buildWeightRecord(Long id, BigDecimal metricValue) {
        BodyMetricRecord record = new BodyMetricRecord();
        record.setId(id);
        record.setMetricType(BodyMetricType.WEIGHT);
        record.setMetricValue(metricValue);
        record.setUnit(BodyMetricUnit.KG);
        record.setRecordDate(LocalDate.now());
        return record;
    }
}
