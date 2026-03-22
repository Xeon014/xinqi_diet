package com.diet.service;

import com.diet.common.NotFoundException;
import com.diet.domain.exercise.Exercise;
import com.diet.domain.exercise.ExerciseRecord;
import com.diet.domain.exercise.ExerciseRecordRepository;
import com.diet.domain.exercise.ExerciseRepository;
import com.diet.domain.food.Food;
import com.diet.domain.food.FoodQuantityUnit;
import com.diet.domain.food.FoodRepository;
import com.diet.domain.record.MealRecord;
import com.diet.domain.record.MealRecordRepository;
import com.diet.domain.record.MealType;
import com.diet.domain.user.Gender;
import com.diet.domain.user.GoalCalorieStrategy;
import com.diet.domain.user.GoalMode;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.user.ActionSuggestionResponse;
import com.diet.dto.user.CreateUserRequest;
import com.diet.dto.user.DailyInsightResponse;
import com.diet.dto.user.DailyRecordResponse;
import com.diet.dto.user.DailyRecordType;
import com.diet.dto.user.GoalPlanPreviewResponse;
import com.diet.dto.user.GoalWarningLevel;
import com.diet.dto.user.DailySummaryResponse;
import com.diet.dto.user.MealProgressResponse;
import com.diet.dto.user.ProgressPointResponse;
import com.diet.dto.user.ProgressSummaryResponse;
import com.diet.dto.user.TrendInsightResponse;
import com.diet.dto.user.UpdateUserRequest;
import com.diet.dto.user.UserResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserProfileService {

    private static final int NAME_MAX_LENGTH = 20;
    private static final int GOAL_DELTA_MIN = -2000;
    private static final int GOAL_DELTA_MAX = 2000;
    private static final BigDecimal DAILY_CONSUMPTION_BASE_RATIO = new BigDecimal("0.70");

    private static final Map<MealType, BigDecimal> MEAL_TARGET_RATIO = Map.of(
            MealType.BREAKFAST, BigDecimal.valueOf(0.25),
            MealType.MORNING_SNACK, BigDecimal.valueOf(0.10),
            MealType.LUNCH, BigDecimal.valueOf(0.30),
            MealType.AFTERNOON_SNACK, BigDecimal.valueOf(0.10),
            MealType.DINNER, BigDecimal.valueOf(0.20),
            MealType.LATE_NIGHT_SNACK, BigDecimal.valueOf(0.05)
    );

    private static final Map<MealType, String> MEAL_LABELS = Map.of(
            MealType.BREAKFAST, "早餐",
            MealType.MORNING_SNACK, "上午加餐",
            MealType.LUNCH, "午餐",
            MealType.AFTERNOON_SNACK, "下午加餐",
            MealType.DINNER, "晚餐",
            MealType.LATE_NIGHT_SNACK, "夜宵",
            MealType.OTHER, "其他"
    );

    private static final List<MealType> RECOMMENDED_MEAL_TYPES = List.of(
            MealType.BREAKFAST,
            MealType.MORNING_SNACK,
            MealType.LUNCH,
            MealType.AFTERNOON_SNACK,
            MealType.DINNER,
            MealType.LATE_NIGHT_SNACK
    );

    private static final List<MealType> MEAL_PROGRESS_ORDER = List.of(
            MealType.BREAKFAST,
            MealType.MORNING_SNACK,
            MealType.LUNCH,
            MealType.AFTERNOON_SNACK,
            MealType.DINNER,
            MealType.LATE_NIGHT_SNACK,
            MealType.OTHER
    );

    private final UserProfileRepository userProfileRepository;

    private final MealRecordRepository mealRecordRepository;

    private final FoodRepository foodRepository;

    private final ExerciseRecordRepository exerciseRecordRepository;

    private final ExerciseRepository exerciseRepository;

    private final GoalPlanningService goalPlanningService;

    public UserProfileService(
            UserProfileRepository userProfileRepository,
            MealRecordRepository mealRecordRepository,
            FoodRepository foodRepository,
            ExerciseRecordRepository exerciseRecordRepository,
            ExerciseRepository exerciseRepository,
            GoalPlanningService goalPlanningService
    ) {
        this.userProfileRepository = userProfileRepository;
        this.mealRecordRepository = mealRecordRepository;
        this.foodRepository = foodRepository;
        this.exerciseRecordRepository = exerciseRecordRepository;
        this.exerciseRepository = exerciseRepository;
        this.goalPlanningService = goalPlanningService;
    }

    public UserResponse create(CreateUserRequest request) {
        GoalCalorieStrategy goalCalorieStrategy = resolveGoalCalorieStrategy(request.goalCalorieStrategy(), null);
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
            Integer baseCalories = calculateEffectiveBaseCaloriesFromParams(
                    request.gender(),
                    request.birthDate(),
                    request.height(),
                    request.currentWeight(),
                    request.customBmr(),
                    request.customTdee()
            );
            goalMode = resolveGoalMode(request.goalMode(), null);
            goalCalorieDelta = resolveGoalCalorieDelta(
                    request.goalMode(),
                    request.goalCalorieDelta(),
                    request.dailyCalorieTarget(),
                    goalMode,
                    null,
                    baseCalories
            );
            targetCalories = calculateTargetCalories(baseCalories, goalCalorieDelta);
        }

        UserProfile user = new UserProfile(
                normalizeNameForCreate(request.name()),
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
        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> findAll() {
        return userProfileRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse findById(Long id) {
        return toResponse(getUser(id));
    }

    @Transactional(readOnly = true)
    public GoalPlanPreviewResponse previewGoalPlan(Long id, UpdateUserRequest request) {
        UserProfile user = getUser(id);
        return goalPlanningService.preview(buildGoalPlanningProfile(user, request));
    }

    public UserResponse update(Long id, UpdateUserRequest request) {
        UserProfile user = getUser(id);
        String nextName = resolveNameForUpdate(request.name(), user.getName());
        var nextGender = resolveValue(request.gender(), user.getGender());
        LocalDate nextBirthDate = resolveValue(request.birthDate(), user.getBirthDate());
        BigDecimal nextHeight = resolveValue(request.height(), user.getHeight());
        var nextActivityLevel = resolveValue(request.activityLevel(), user.getActivityLevel());
        BigDecimal nextCurrentWeight = resolveValue(request.currentWeight(), user.getCurrentWeight());
        BigDecimal nextTargetWeight = resolveValue(request.targetWeight(), user.getTargetWeight());
        LocalDate nextGoalTargetDate = resolveValue(request.goalTargetDate(), user.getGoalTargetDate());
        GoalCalorieStrategy nextGoalCalorieStrategy = resolveGoalCalorieStrategy(request.goalCalorieStrategy(), user.getGoalCalorieStrategy());
        Integer nextCustomBmr = resolveCustomBmr(request, nextGender, nextBirthDate, nextHeight, nextCurrentWeight, user.getCustomBmr());
        Integer nextCustomTdee = resolveCustomTdee(request.customTdee(), user.getCustomTdee());
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
            Integer nextBaseCalories = calculateEffectiveBaseCaloriesFromParams(
                    nextGender,
                    nextBirthDate,
                    nextHeight,
                    nextCurrentWeight,
                    nextCustomBmr,
                    nextCustomTdee
            );
            nextGoalMode = resolveGoalMode(request.goalMode(), user.getGoalMode());
            nextGoalCalorieDelta = resolveGoalCalorieDelta(
                    request.goalMode(),
                    request.goalCalorieDelta(),
                    request.dailyCalorieTarget(),
                    nextGoalMode,
                    user.getGoalCalorieDelta(),
                    nextBaseCalories
            );
            nextDailyCalorieTarget = calculateTargetCalories(nextBaseCalories, nextGoalCalorieDelta);
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
        return toResponse(user);
    }


    @Transactional(readOnly = true)
    public DailySummaryResponse getDailySummary(Long userId, LocalDate date) {
        UserProfile user = getUser(userId);

        List<MealRecord> mealRecords = mealRecordRepository.findByUserAndDate(userId, date);
        List<ExerciseRecord> exerciseRecords = exerciseRecordRepository.findByUserAndDate(userId, date);

        Map<Long, Food> foods = loadFoods(mealRecords);
        Map<Long, Exercise> exercises = loadExercises(exerciseRecords);

        BigDecimal dietCalories = sumDietCalories(mealRecords);
        BigDecimal exerciseCalories = sumExerciseCalories(exerciseRecords);
        BigDecimal netCalories = dietCalories.subtract(exerciseCalories).setScale(2, RoundingMode.HALF_UP);
        Integer targetCalories = resolveEffectiveTargetCalories(user);
        BigDecimal remaining = targetCalories == null
                ? null
                : BigDecimal.valueOf(targetCalories).subtract(netCalories).setScale(2, RoundingMode.HALF_UP);

        BigDecimal proteinIntake = sumNutrient(mealRecords, foods, Food::getProteinPer100g);
        BigDecimal carbsIntake = sumNutrient(mealRecords, foods, Food::getCarbsPer100g);
        BigDecimal fatIntake = sumNutrient(mealRecords, foods, Food::getFatPer100g);

        List<DailyRecordResponse> records = Stream.concat(
                        mealRecords.stream().map(record -> toDietDailyRecord(record, foods.get(record.getFoodId()))),
                        exerciseRecords.stream().map(record -> toExerciseDailyRecord(record, exercises.get(record.getExerciseId())))
                )
                .sorted(Comparator.comparing(DailyRecordResponse::createdAt, Comparator.nullsLast(LocalDateTime::compareTo)).reversed())
                .toList();

        List<MealProgressResponse> mealProgress = buildMealProgress(targetCalories, mealRecords);
        MealType topIssueMealType = resolveTopIssueMealType(targetCalories, mealRecords, date, date);
        DailyInsightResponse dailyInsight = buildDailyInsight(
                remaining,
                topIssueMealType,
                mealProgress,
                proteinIntake,
                mealRecords.isEmpty(),
                records.size()
        );
        TrendInsightResponse trendInsight = buildTrendInsight(user, date);

        return new DailySummaryResponse(
                userId,
                date,
                targetCalories,
                dietCalories,
                exerciseCalories,
                netCalories,
                netCalories,
                remaining,
                remaining != null && remaining.compareTo(BigDecimal.ZERO) < 0,
                proteinIntake,
                carbsIntake,
                fatIntake,
                records,
                mealProgress,
                dailyInsight,
                trendInsight
        );
    }

    @Transactional(readOnly = true)
    public ProgressSummaryResponse getProgress(Long userId, LocalDate startDate, LocalDate endDate) {
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("endDate must not be before startDate");
        }

        UserProfile user = getUser(userId);
        List<MealRecord> mealRecords = mealRecordRepository.findByUserAndDateRange(userId, startDate, endDate);
        List<ExerciseRecord> exerciseRecords = exerciseRecordRepository.findByUserAndDateRange(userId, startDate, endDate);

        List<ProgressPointResponse> trend = startDate.datesUntil(endDate.plusDays(1))
                .map(date -> buildPoint(user, date, mealRecords, exerciseRecords))
                .toList();

        BigDecimal totalCalories = trend.stream()
                .map(ProgressPointResponse::consumedCalories)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal averageCalories = trend.isEmpty()
                ? BigDecimal.ZERO
                : totalCalories.divide(BigDecimal.valueOf(trend.size()), 2, RoundingMode.HALF_UP);

        List<BigDecimal> gaps = trend.stream()
                .map(ProgressPointResponse::calorieGap)
                .filter(java.util.Objects::nonNull)
                .toList();

        BigDecimal totalGap = gaps.isEmpty()
                ? null
                : gaps.stream().reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

        BigDecimal averageGap = gaps.isEmpty()
                ? null
                : totalGap.divide(BigDecimal.valueOf(gaps.size()), 2, RoundingMode.HALF_UP);

        int exerciseDays = (int) exerciseRecords.stream()
                .map(ExerciseRecord::getRecordDate)
                .distinct()
                .count();

        MealType topExceededMealType = resolveTopIssueMealType(resolveEffectiveTargetCalories(user), mealRecords, startDate, endDate);

        return new ProgressSummaryResponse(
                userId,
                startDate,
                endDate,
                averageCalories,
                totalCalories,
                averageGap,
                user.weightToLose(),
                exerciseDays,
                topExceededMealType,
                trend
        );
    }

    private ProgressPointResponse buildPoint(
            UserProfile user,
            LocalDate date,
            List<MealRecord> mealRecords,
            List<ExerciseRecord> exerciseRecords
    ) {
        BigDecimal dietCalories = mealRecords.stream()
                .filter(record -> record.getRecordDate().equals(date))
                .map(MealRecord::getTotalCalories)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal exerciseCalories = exerciseRecords.stream()
                .filter(record -> record.getRecordDate().equals(date))
                .map(ExerciseRecord::getTotalCalories)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netCalories = dietCalories.subtract(exerciseCalories).setScale(2, RoundingMode.HALF_UP);
        Integer targetCalories = resolveEffectiveTargetCalories(user);
        BigDecimal gap = targetCalories == null
                ? null
                : BigDecimal.valueOf(targetCalories).subtract(netCalories).setScale(2, RoundingMode.HALF_UP);

        return new ProgressPointResponse(date, netCalories, targetCalories, gap);
    }

    private List<MealProgressResponse> buildMealProgress(Integer dailyTargetCalories, List<MealRecord> mealRecords) {
        EnumMap<MealType, BigDecimal> intakeByMeal = new EnumMap<>(MealType.class);
        for (MealType mealType : MealType.values()) {
            intakeByMeal.put(mealType, BigDecimal.ZERO);
        }

        for (MealRecord mealRecord : mealRecords) {
            intakeByMeal.merge(mealRecord.getMealType(), mealRecord.getTotalCalories(), BigDecimal::add);
        }

        return MEAL_PROGRESS_ORDER
                .stream()
                .map(mealType -> {
                    BigDecimal intake = intakeByMeal.getOrDefault(mealType, BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal mealTargetRatio = MEAL_TARGET_RATIO.get(mealType);
                    BigDecimal target = dailyTargetCalories == null || mealTargetRatio == null
                            ? null
                            : BigDecimal.valueOf(dailyTargetCalories)
                            .multiply(mealTargetRatio)
                            .setScale(2, RoundingMode.HALF_UP);
                    BigDecimal remaining = target == null ? null : target.subtract(intake).setScale(2, RoundingMode.HALF_UP);

                    return new MealProgressResponse(
                            mealType,
                            MEAL_LABELS.get(mealType),
                            intake,
                            target,
                            remaining,
                            remaining != null && remaining.compareTo(BigDecimal.ZERO) < 0,
                            intake.compareTo(BigDecimal.ZERO) > 0
                    );
                })
                .toList();
    }

    private MealType resolveTopIssueMealType(
            Integer dailyTargetCalories,
            List<MealRecord> mealRecords,
            LocalDate startDate,
            LocalDate endDate
    ) {
        if (dailyTargetCalories == null) {
            return null;
        }

        EnumMap<MealType, BigDecimal> overflowMap = new EnumMap<>(MealType.class);
        for (MealType mealType : MealType.values()) {
            overflowMap.put(mealType, BigDecimal.ZERO);
        }

        Map<LocalDate, List<MealRecord>> recordsByDate = mealRecords.stream()
                .collect(Collectors.groupingBy(MealRecord::getRecordDate, LinkedHashMap::new, Collectors.toList()));

        startDate.datesUntil(endDate.plusDays(1)).forEach(date -> {
            List<MealRecord> sameDayRecords = recordsByDate.getOrDefault(date, List.of());
            for (MealType mealType : RECOMMENDED_MEAL_TYPES) {
                BigDecimal dayIntake = sameDayRecords.stream()
                        .filter(record -> record.getMealType() == mealType)
                        .map(MealRecord::getTotalCalories)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal dayTarget = BigDecimal.valueOf(dailyTargetCalories)
                        .multiply(MEAL_TARGET_RATIO.get(mealType));

                BigDecimal overflow = dayIntake.subtract(dayTarget);
                if (overflow.compareTo(BigDecimal.ZERO) > 0) {
                    overflowMap.merge(mealType, overflow, BigDecimal::add);
                }
            }
        });

        return overflowMap.entrySet()
                .stream()
                .max(Map.Entry.comparingByValue())
                .filter(entry -> entry.getValue().compareTo(BigDecimal.ZERO) > 0)
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    private DailyInsightResponse buildDailyInsight(
            BigDecimal remainingCalories,
            MealType topIssueMealType,
            List<MealProgressResponse> mealProgress,
            BigDecimal proteinIntake,
            boolean noRecords,
            int totalRecords
    ) {
        List<MealProgressResponse> recommendedMealProgress = mealProgress.stream()
                .filter(progress -> MEAL_TARGET_RATIO.containsKey(progress.mealType()))
                .toList();
        int recordedMeals = (int) recommendedMealProgress.stream().filter(MealProgressResponse::recorded).count();
        double completeness = recommendedMealProgress.isEmpty()
                ? 0d
                : BigDecimal.valueOf(recordedMeals)
                        .divide(BigDecimal.valueOf(recommendedMealProgress.size()), 2, RoundingMode.HALF_UP)
                        .doubleValue();

        List<ActionSuggestionResponse> suggestions = new ArrayList<>();
        MealProgressResponse firstMissingMeal = recommendedMealProgress.stream()
                .filter(progress -> !progress.recorded())
                .findFirst()
                .orElse(null);
        if (firstMissingMeal != null) {
            suggestions.add(new ActionSuggestionResponse(
                    "RECORD_MEAL",
                    "????",
                    "?????" + firstMissingMeal.mealLabel() + "????????",
                    firstMissingMeal.mealType()
            ));
        }

        if (remainingCalories != null && remainingCalories.compareTo(BigDecimal.ZERO) < 0 && topIssueMealType != null) {
            suggestions.add(new ActionSuggestionResponse(
                    "CONTROL_MEAL",
                    "??????",
                    MEAL_LABELS.get(topIssueMealType) + "??????????????????",
                    topIssueMealType
            ));
        }

        if (proteinIntake.compareTo(BigDecimal.valueOf(60)) < 0 && suggestions.size() < 2) {
            suggestions.add(new ActionSuggestionResponse(
                    "PROTEIN",
                    "?????",
                    "?????????????????????????",
                    null
            ));
        }

        String summaryText = "";
        if (remainingCalories == null) {
            summaryText = "????????????????";
        } else if (remainingCalories.compareTo(BigDecimal.ZERO) < 0) {
            summaryText = "?????? " + remainingCalories.abs().setScale(0, RoundingMode.HALF_UP).toPlainString() + " kcal?";
        } else if (completeness >= 0.75) {
            summaryText = "??????????????";
        }

        return new DailyInsightResponse(summaryText, topIssueMealType, completeness, suggestions.stream().limit(2).toList());
    }

    private TrendInsightResponse buildTrendInsight(UserProfile user, LocalDate date) {
        LocalDate startDate = date.minusDays(6);
        List<MealRecord> mealRecords = mealRecordRepository.findByUserAndDateRange(user.getId(), startDate, date);
        List<ExerciseRecord> exerciseRecords = exerciseRecordRepository.findByUserAndDateRange(user.getId(), startDate, date);

        List<ProgressPointResponse> points = startDate.datesUntil(date.plusDays(1))
                .map(day -> buildPoint(user, day, mealRecords, exerciseRecords))
                .toList();

        BigDecimal averageNetCalories = points.stream()
                .map(ProgressPointResponse::consumedCalories)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(points.size()), 2, RoundingMode.HALF_UP);

        int exerciseDays = (int) exerciseRecords.stream()
                .map(ExerciseRecord::getRecordDate)
                .distinct()
                .count();

        MealType topExceededMealType = resolveTopIssueMealType(resolveEffectiveTargetCalories(user), mealRecords, startDate, date);

        return new TrendInsightResponse(averageNetCalories, exerciseDays, topExceededMealType);
    }

    private BigDecimal sumDietCalories(List<MealRecord> records) {
        return records.stream()
                .map(MealRecord::getTotalCalories)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal sumExerciseCalories(List<ExerciseRecord> records) {
        return records.stream()
                .map(ExerciseRecord::getTotalCalories)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal sumNutrient(
            List<MealRecord> records,
            Map<Long, Food> foods,
            java.util.function.Function<Food, BigDecimal> nutrientGetter
    ) {
        return records.stream()
                .map(record -> {
                    Food food = foods.get(record.getFoodId());
                    return nutrientGetter.apply(food)
                            .multiply(record.getQuantityInGram())
                            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private Map<Long, Food> loadFoods(List<MealRecord> records) {
        return records.stream()
                .map(MealRecord::getFoodId)
                .distinct()
                .map(this::getFood)
                .collect(Collectors.toMap(Food::getId, food -> food));
    }

    private Map<Long, Exercise> loadExercises(List<ExerciseRecord> records) {
        return records.stream()
                .map(ExerciseRecord::getExerciseId)
                .distinct()
                .map(this::getExercise)
                .collect(Collectors.toMap(Exercise::getId, exercise -> exercise));
    }

    private DailyRecordResponse toDietDailyRecord(MealRecord record, Food food) {
        return new DailyRecordResponse(
                DailyRecordType.DIET,
                record.getId(),
                record.getRecordDate(),
                record.getCreatedAt(),
                record.getMealType(),
                food.getQuantityUnit() == null ? FoodQuantityUnit.G : food.getQuantityUnit(),
                food.getName(),
                record.getQuantityInGram(),
                null,
                null,
                null,
                record.getTotalCalories()
        );
    }

    private DailyRecordResponse toExerciseDailyRecord(ExerciseRecord record, Exercise exercise) {
        return new DailyRecordResponse(
                DailyRecordType.EXERCISE,
                record.getId(),
                record.getRecordDate(),
                record.getCreatedAt(),
                null,
                null,
                null,
                null,
                exercise.getName(),
                record.getDurationMinutes(),
                record.getIntensityLevel(),
                record.getTotalCalories()
        );
    }

    private UserProfile getUser(Long id) {
        return userProfileRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("user not found, id=" + id));
    }

    private Food getFood(Long id) {
        return foodRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("food not found, id=" + id));
    }

    private Exercise getExercise(Long id) {
        return exerciseRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("exercise not found, id=" + id));
    }

    private UserResponse toResponse(UserProfile user) {
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

    private String normalizeNameForCreate(String name) {
        if (name == null || name.isBlank()) {
            return null;
        }
        return normalizeName(name, "name must not be blank");
    }

    private String resolveNameForUpdate(String requestedName, String currentName) {
        if (requestedName == null) {
            return currentName;
        }
        return normalizeName(requestedName, "name must not be blank");
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

    private <T> T resolveValue(T requested, T currentValue) {
        return requested != null ? requested : currentValue;
    }

    private Integer resolveEffectiveTargetCalories(UserProfile user) {
        return resolveGoalPreview(user).recommendedDailyCalorieTarget();
    }

    private Integer calculateEffectiveBaseCaloriesFromParams(
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


    private Integer resolveCustomTdee(Integer requestedCustomTdee, Integer currentCustomTdee) {
        return requestedCustomTdee != null ? requestedCustomTdee : currentCustomTdee;
    }

    private GoalMode resolveGoalMode(GoalMode requestedGoalMode, GoalMode currentGoalMode) {
        if (requestedGoalMode != null) {
            return requestedGoalMode;
        }
        return currentGoalMode != null ? currentGoalMode : GoalMode.MAINTAIN;
    }

    private GoalCalorieStrategy resolveGoalCalorieStrategy(
            GoalCalorieStrategy requestedGoalCalorieStrategy,
            GoalCalorieStrategy currentGoalCalorieStrategy
    ) {
        if (requestedGoalCalorieStrategy != null) {
            return requestedGoalCalorieStrategy;
        }
        return currentGoalCalorieStrategy != null ? currentGoalCalorieStrategy : GoalCalorieStrategy.MANUAL;
    }

    private Integer resolveGoalCalorieDelta(
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

    private Integer calculateTargetCalories(Integer baseCalories, Integer goalCalorieDelta) {
        if (baseCalories == null) {
            return null;
        }
        return baseCalories + normalizeGoalCalorieDelta(goalCalorieDelta);
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

    private Integer resolveCustomBmr(
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

    private GoalPlanPreviewResponse resolveGoalPreview(UserProfile user) {
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

    private GoalPlanningService.GoalPlanningProfile buildGoalPlanningProfile(UserProfile user, UpdateUserRequest request) {
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
}
