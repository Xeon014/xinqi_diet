package com.diet.service;

import com.diet.domain.user.GoalCalorieStrategy;
import com.diet.domain.user.GoalMode;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.user.CreateUserRequest;
import com.diet.dto.user.GoalPlanPreviewResponse;
import com.diet.dto.user.UpdateUserRequest;
import com.diet.dto.user.UserResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserProfileApplicationService {

    private final UserProfileRepository userProfileRepository;

    private final GoalPlanningService goalPlanningService;

    private final BodyMetricRecordCommandService bodyMetricRecordCommandService;

    private final UserProfileSupport userProfileSupport;

    public UserProfileApplicationService(
            UserProfileRepository userProfileRepository,
            GoalPlanningService goalPlanningService,
            BodyMetricRecordCommandService bodyMetricRecordCommandService,
            UserProfileSupport userProfileSupport
    ) {
        this.userProfileRepository = userProfileRepository;
        this.goalPlanningService = goalPlanningService;
        this.bodyMetricRecordCommandService = bodyMetricRecordCommandService;
        this.userProfileSupport = userProfileSupport;
    }

    public UserResponse create(CreateUserRequest request) {
        GoalCalorieStrategy goalCalorieStrategy = userProfileSupport.resolveGoalCalorieStrategy(request.goalCalorieStrategy(), null);
        GoalMode goalMode;
        Integer goalCalorieDelta;
        Integer targetCalories;

        if (goalCalorieStrategy == GoalCalorieStrategy.SMART) {
            GoalPlanPreviewResponse preview = goalPlanningService.preview(new GoalPlanningService.GoalPlanningProfile(
                    null,
                    request.gender(),
                    request.birthDate(),
                    request.height(),
                    request.currentWeight(),
                    request.targetWeight(),
                    request.customBmr(),
                    request.customTdee(),
                    request.dailyCalorieTarget(),
                    request.goalMode(),
                    request.goalCalorieDelta(),
                    null,
                    null,
                    null,
                    request.goalTargetDate(),
                    goalCalorieStrategy
            ));
            goalMode = preview.goalMode();
            goalCalorieDelta = preview.recommendedGoalCalorieDelta();
            targetCalories = preview.recommendedDailyCalorieTarget();
        } else {
            Integer baseCalories = userProfileSupport.calculateEffectiveBaseCaloriesFromParams(
                    request.gender(),
                    request.birthDate(),
                    request.height(),
                    request.currentWeight(),
                    request.customBmr(),
                    request.customTdee()
            );
            goalMode = userProfileSupport.resolveGoalMode(request.goalMode(), null);
            goalCalorieDelta = userProfileSupport.resolveGoalCalorieDelta(
                    request.goalMode(),
                    request.goalCalorieDelta(),
                    request.dailyCalorieTarget(),
                    goalMode,
                    null,
                    baseCalories
            );
            targetCalories = userProfileSupport.calculateTargetCalories(baseCalories, goalCalorieDelta);
        }

        UserProfile user = new UserProfile(
                userProfileSupport.normalizeNameForCreate(request.name()),
                request.gender(),
                request.birthDate(),
                request.height(),
                request.activityLevel(),
                targetCalories,
                request.currentWeight(),
                request.targetWeight(),
                request.customBmr(),
                request.customTdee(),
                goalMode,
                goalCalorieDelta,
                request.goalTargetDate(),
                goalCalorieStrategy
        );
        userProfileRepository.save(user);
        return userProfileSupport.toResponse(user);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> findAll() {
        return userProfileRepository.findAll()
                .stream()
                .map(userProfileSupport::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse findById(Long id) {
        return userProfileSupport.toResponse(userProfileSupport.getUser(id));
    }

    public UserResponse update(Long id, UpdateUserRequest request) {
        UserProfile user = userProfileSupport.getUser(id);
        String nextName = userProfileSupport.resolveNameForUpdate(request.name(), user.getName());
        var nextGender = userProfileSupport.resolveValue(request.gender(), user.getGender());
        LocalDate nextBirthDate = userProfileSupport.resolveValue(request.birthDate(), user.getBirthDate());
        BigDecimal nextHeight = userProfileSupport.resolveValue(request.height(), user.getHeight());
        var nextActivityLevel = userProfileSupport.resolveValue(request.activityLevel(), user.getActivityLevel());
        BigDecimal nextCurrentWeight = userProfileSupport.resolveValue(request.currentWeight(), user.getCurrentWeight());
        BigDecimal nextTargetWeight = userProfileSupport.resolveValue(request.targetWeight(), user.getTargetWeight());
        LocalDate nextGoalTargetDate = userProfileSupport.resolveValue(request.goalTargetDate(), user.getGoalTargetDate());
        GoalCalorieStrategy nextGoalCalorieStrategy = userProfileSupport.resolveGoalCalorieStrategy(
                request.goalCalorieStrategy(),
                user.getGoalCalorieStrategy()
        );
        Integer nextCustomBmr = userProfileSupport.resolveCustomBmr(
                request,
                nextGender,
                nextBirthDate,
                nextHeight,
                nextCurrentWeight,
                user.getCustomBmr()
        );
        Integer nextCustomTdee = userProfileSupport.resolveCustomTdee(request.customTdee(), user.getCustomTdee());
        GoalMode nextGoalMode;
        Integer nextGoalCalorieDelta;
        Integer nextDailyCalorieTarget;

        if (nextGoalCalorieStrategy == GoalCalorieStrategy.SMART) {
            GoalPlanPreviewResponse preview = goalPlanningService.preview(new GoalPlanningService.GoalPlanningProfile(
                    user.getId(),
                    nextGender,
                    nextBirthDate,
                    nextHeight,
                    nextCurrentWeight,
                    nextTargetWeight,
                    nextCustomBmr,
                    nextCustomTdee,
                    request.dailyCalorieTarget(),
                    request.goalMode(),
                    request.goalCalorieDelta(),
                    user.getDailyCalorieTarget(),
                    user.getGoalMode(),
                    user.getGoalCalorieDelta(),
                    nextGoalTargetDate,
                    nextGoalCalorieStrategy
            ));
            nextGoalMode = preview.goalMode();
            nextGoalCalorieDelta = preview.recommendedGoalCalorieDelta();
            nextDailyCalorieTarget = preview.recommendedDailyCalorieTarget();
        } else {
            Integer nextBaseCalories = userProfileSupport.calculateEffectiveBaseCaloriesFromParams(
                    nextGender,
                    nextBirthDate,
                    nextHeight,
                    nextCurrentWeight,
                    nextCustomBmr,
                    nextCustomTdee
            );
            nextGoalMode = userProfileSupport.resolveGoalMode(request.goalMode(), user.getGoalMode());
            nextGoalCalorieDelta = userProfileSupport.resolveGoalCalorieDelta(
                    request.goalMode(),
                    request.goalCalorieDelta(),
                    request.dailyCalorieTarget(),
                    nextGoalMode,
                    user.getGoalCalorieDelta(),
                    nextBaseCalories
            );
            nextDailyCalorieTarget = userProfileSupport.calculateTargetCalories(nextBaseCalories, nextGoalCalorieDelta);
        }

        user.updateProfile(
                nextName,
                nextGender,
                nextBirthDate,
                nextHeight,
                nextActivityLevel,
                nextDailyCalorieTarget,
                nextCurrentWeight,
                nextTargetWeight,
                nextCustomBmr,
                nextCustomTdee,
                nextGoalMode,
                nextGoalCalorieDelta,
                nextGoalTargetDate,
                nextGoalCalorieStrategy
        );
        userProfileRepository.update(user);
        seedInitialWeightRecordIfNeeded(user, request, nextCurrentWeight);
        return userProfileSupport.toResponse(user);
    }

    private void seedInitialWeightRecordIfNeeded(UserProfile user, UpdateUserRequest request, BigDecimal nextCurrentWeight) {
        if (!Boolean.TRUE.equals(request.seedInitialWeightRecord()) || nextCurrentWeight == null) {
            return;
        }
        bodyMetricRecordCommandService.seedInitialWeightRecord(user.getId(), nextCurrentWeight, LocalDate.now());
    }
}
