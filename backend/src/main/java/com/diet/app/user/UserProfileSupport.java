package com.diet.app.user;

import com.diet.types.common.NotFoundException;
import com.diet.domain.user.Gender;
import com.diet.domain.user.GoalCalorieStrategy;
import com.diet.domain.user.GoalMode;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.api.user.GoalPlanPreviewResponse;
import com.diet.api.user.GoalWarningLevel;
import com.diet.api.user.UpdateUserRequest;
import com.diet.api.user.UserResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;
import org.springframework.stereotype.Component;

@Component
class UserProfileSupport {

    private static final int NAME_MAX_LENGTH = 20;

    private static final int GOAL_DELTA_MIN = -2000;

    private static final int GOAL_DELTA_MAX = 2000;

    private static final BigDecimal DAILY_CONSUMPTION_BASE_RATIO = new BigDecimal("0.70");

    private final UserProfileRepository userProfileRepository;

    private final GoalPlanningService goalPlanningService;

    UserProfileSupport(UserProfileRepository userProfileRepository, GoalPlanningService goalPlanningService) {
        this.userProfileRepository = userProfileRepository;
        this.goalPlanningService = goalPlanningService;
    }

    UserProfile getUser(Long id) {
        return userProfileRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("user not found, id=" + id));
    }

    UserResponse toResponse(UserProfile user) {
        GoalPlanPreviewResponse goalPreview = resolveGoalPreview(user);
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getGender(),
                user.getBirthDate(),
                user.calculateAge(),
                user.getHeight(),
                user.getActivityLevel(),
                goalPreview.recommendedDailyCalorieTarget(),
                user.getCurrentWeight(),
                user.getTargetWeight(),
                user.getCustomBmr(),
                user.getCustomTdee(),
                goalPreview.goalMode(),
                goalPreview.recommendedGoalCalorieDelta(),
                user.getGoalTargetDate(),
                user.resolveGoalCalorieStrategy(),
                user.calculateBmi(),
                user.calculateBmr(),
                user.calculateTdee(),
                user.getCreatedAt()
        );
    }

    String normalizeNameForCreate(String name) {
        if (name == null || name.isBlank()) {
            return null;
        }
        return normalizeName(name, "name must not be blank");
    }

    String resolveNameForUpdate(String requestedName, String currentName) {
        if (requestedName == null) {
            return currentName;
        }
        return normalizeName(requestedName, "name must not be blank");
    }

    <T> T resolveValue(T requested, T currentValue) {
        return requested != null ? requested : currentValue;
    }

    Integer resolveEffectiveTargetCalories(UserProfile user) {
        return resolveGoalPreview(user).recommendedDailyCalorieTarget();
    }

    Integer calculateEffectiveBaseCaloriesFromParams(
            Gender gender,
            LocalDate birthDate,
            BigDecimal height,
            BigDecimal currentWeight,
            Integer customBmr,
            Integer customTdee
    ) {
        BigDecimal tdee = calculateEffectiveTdeeFromParams(gender, birthDate, height, currentWeight, customBmr, customTdee);
        if (tdee == null) {
            return null;
        }
        return tdee.setScale(0, RoundingMode.HALF_UP).intValue();
    }

    Integer resolveCustomTdee(Integer requestedCustomTdee, Integer currentCustomTdee) {
        return requestedCustomTdee != null ? requestedCustomTdee : currentCustomTdee;
    }

    GoalMode resolveGoalMode(GoalMode requestedGoalMode, GoalMode currentGoalMode) {
        if (requestedGoalMode != null) {
            return requestedGoalMode;
        }
        return currentGoalMode != null ? currentGoalMode : GoalMode.MAINTAIN;
    }

    GoalCalorieStrategy resolveGoalCalorieStrategy(
            GoalCalorieStrategy requestedGoalCalorieStrategy,
            GoalCalorieStrategy currentGoalCalorieStrategy
    ) {
        if (requestedGoalCalorieStrategy != null) {
            return requestedGoalCalorieStrategy;
        }
        return currentGoalCalorieStrategy != null ? currentGoalCalorieStrategy : GoalCalorieStrategy.MANUAL;
    }

    Integer resolveGoalCalorieDelta(
            GoalMode requestedGoalMode,
            Integer requestedGoalCalorieDelta,
            Integer compatibleDailyCalorieTarget,
            GoalMode resolvedGoalMode,
            Integer currentGoalCalorieDelta,
            Integer baseCalories
    ) {
        Integer goalCalorieDelta = requestedGoalCalorieDelta;
        if (goalCalorieDelta == null && compatibleDailyCalorieTarget != null) {
            if (baseCalories == null) {
                throw new IllegalArgumentException("设置目标热量前请先完善基础代谢或基础日消耗");
            }
            goalCalorieDelta = compatibleDailyCalorieTarget - baseCalories;
        }
        if (goalCalorieDelta == null && requestedGoalMode != null) {
            goalCalorieDelta = resolvedGoalMode.getDefaultDelta();
        }
        if (goalCalorieDelta == null && currentGoalCalorieDelta != null) {
            goalCalorieDelta = currentGoalCalorieDelta;
        }
        if (goalCalorieDelta == null) {
            goalCalorieDelta = GoalMode.MAINTAIN.getDefaultDelta();
        }
        validateGoalCalorieDelta(goalCalorieDelta);
        return goalCalorieDelta;
    }

    Integer calculateTargetCalories(Integer baseCalories, Integer goalCalorieDelta) {
        if (baseCalories == null) {
            return null;
        }
        return baseCalories + normalizeGoalCalorieDelta(goalCalorieDelta);
    }

    Integer resolveCustomBmr(
            UpdateUserRequest request,
            Gender resolvedGender,
            LocalDate resolvedBirthDate,
            BigDecimal resolvedHeight,
            BigDecimal resolvedCurrentWeight,
            Integer currentCustomBmr
    ) {
        if (Boolean.TRUE.equals(request.useFormulaBmr())) {
            if (resolvedGender == null || resolvedBirthDate == null || resolvedHeight == null || resolvedCurrentWeight == null) {
                throw new IllegalArgumentException("useFormulaBmr requires gender, birthDate, height and currentWeight");
            }
            return null;
        }
        if (request.customBmr() != null) {
            return request.customBmr();
        }
        return currentCustomBmr;
    }

    GoalPlanPreviewResponse resolveGoalPreview(UserProfile user) {
        try {
            return goalPlanningService.preview(new GoalPlanningService.GoalPlanningProfile(
                    user.getId(),
                    user.getGender(),
                    user.getBirthDate(),
                    user.getHeight(),
                    user.getCurrentWeight(),
                    user.getTargetWeight(),
                    user.getCustomBmr(),
                    user.getCustomTdee(),
                    null,
                    null,
                    null,
                    user.getDailyCalorieTarget(),
                    user.getGoalMode(),
                    user.getGoalCalorieDelta(),
                    user.getGoalTargetDate(),
                    user.resolveGoalCalorieStrategy()
            ));
        } catch (IllegalArgumentException exception) {
            return new GoalPlanPreviewResponse(
                    user.getDailyCalorieTarget(),
                    user.getGoalCalorieDelta(),
                    user.resolveGoalMode(),
                    BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                    GoalWarningLevel.NONE,
                    "",
                    false
            );
        }
    }

    GoalPlanningService.GoalPlanningProfile buildGoalPlanningProfile(UserProfile user, UpdateUserRequest request) {
        Gender nextGender = resolveValue(request.gender(), user.getGender());
        LocalDate nextBirthDate = resolveValue(request.birthDate(), user.getBirthDate());
        BigDecimal nextHeight = resolveValue(request.height(), user.getHeight());
        BigDecimal nextCurrentWeight = resolveValue(request.currentWeight(), user.getCurrentWeight());
        BigDecimal nextTargetWeight = resolveValue(request.targetWeight(), user.getTargetWeight());
        Integer nextCustomBmr = resolveCustomBmr(request, nextGender, nextBirthDate, nextHeight, nextCurrentWeight, user.getCustomBmr());
        Integer nextCustomTdee = resolveCustomTdee(request.customTdee(), user.getCustomTdee());

        return new GoalPlanningService.GoalPlanningProfile(
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
                resolveValue(request.goalTargetDate(), user.getGoalTargetDate()),
                resolveGoalCalorieStrategy(request.goalCalorieStrategy(), user.getGoalCalorieStrategy())
        );
    }

    private String normalizeName(String name, String blankMessage) {
        String trimmed = name.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException(blankMessage);
        }
        if (trimmed.length() > NAME_MAX_LENGTH) {
            throw new IllegalArgumentException("name length must be less than or equal to " + NAME_MAX_LENGTH);
        }
        return trimmed;
    }

    private BigDecimal calculateEffectiveTdeeFromParams(
            Gender gender,
            LocalDate birthDate,
            BigDecimal height,
            BigDecimal currentWeight,
            Integer customBmr,
            Integer customTdee
    ) {
        if (customTdee != null && customTdee > 0) {
            return BigDecimal.valueOf(customTdee).setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal bmr;
        if (customBmr != null && customBmr > 0) {
            bmr = BigDecimal.valueOf(customBmr).setScale(2, RoundingMode.HALF_UP);
        } else {
            bmr = calculateFormulaBmrFromParams(gender, birthDate, height, currentWeight);
        }
        if (bmr == null) {
            return null;
        }
        return bmr.divide(DAILY_CONSUMPTION_BASE_RATIO, 2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateFormulaBmrFromParams(
            Gender gender,
            LocalDate birthDate,
            BigDecimal height,
            BigDecimal currentWeight
    ) {
        if (gender == null || birthDate == null || height == null || currentWeight == null) {
            return null;
        }
        int age = Period.between(birthDate, LocalDate.now()).getYears();
        if (age < 0) {
            return null;
        }
        BigDecimal base = currentWeight.multiply(BigDecimal.TEN)
                .add(height.multiply(BigDecimal.valueOf(6.25)))
                .subtract(BigDecimal.valueOf(age).multiply(BigDecimal.valueOf(5)));
        BigDecimal offset = gender == Gender.MALE ? BigDecimal.valueOf(5) : BigDecimal.valueOf(-161);
        return base.add(offset).setScale(2, RoundingMode.HALF_UP);
    }

    private int normalizeGoalCalorieDelta(Integer goalCalorieDelta) {
        if (goalCalorieDelta == null) {
            return GoalMode.MAINTAIN.getDefaultDelta();
        }
        return goalCalorieDelta;
    }

    private void validateGoalCalorieDelta(Integer goalCalorieDelta) {
        int normalizedDelta = normalizeGoalCalorieDelta(goalCalorieDelta);
        if (normalizedDelta < GOAL_DELTA_MIN || normalizedDelta > GOAL_DELTA_MAX) {
            throw new IllegalArgumentException("goalCalorieDelta must be between -2000 and 2000");
        }
    }
}
