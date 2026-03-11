package com.diet.service;

import com.diet.common.NotFoundException;
import com.diet.domain.exercise.Exercise;
import com.diet.domain.exercise.ExerciseRecord;
import com.diet.domain.exercise.ExerciseRecordRepository;
import com.diet.domain.exercise.ExerciseRepository;
import com.diet.domain.food.Food;
import com.diet.domain.food.FoodRepository;
import com.diet.domain.record.MealRecord;
import com.diet.domain.record.MealRecordRepository;
import com.diet.domain.record.MealType;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.user.ActionSuggestionResponse;
import com.diet.dto.user.CreateUserRequest;
import com.diet.dto.user.DailyInsightResponse;
import com.diet.dto.user.DailyRecordResponse;
import com.diet.dto.user.DailyRecordType;
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

    private static final String DEFAULT_NAME = "微信用户";

    private static final int NAME_MAX_LENGTH = 20;

    private static final Map<MealType, BigDecimal> MEAL_TARGET_RATIO = Map.of(
            MealType.BREAKFAST, BigDecimal.valueOf(0.25),
            MealType.LUNCH, BigDecimal.valueOf(0.35),
            MealType.DINNER, BigDecimal.valueOf(0.30),
            MealType.SNACK, BigDecimal.valueOf(0.10)
    );

    private static final Map<MealType, String> MEAL_LABELS = Map.of(
            MealType.BREAKFAST, "早餐",
            MealType.LUNCH, "午餐",
            MealType.DINNER, "晚餐",
            MealType.SNACK, "加餐"
    );

    private final UserProfileRepository userProfileRepository;

    private final MealRecordRepository mealRecordRepository;

    private final FoodRepository foodRepository;

    private final ExerciseRecordRepository exerciseRecordRepository;

    private final ExerciseRepository exerciseRepository;

    public UserProfileService(
            UserProfileRepository userProfileRepository,
            MealRecordRepository mealRecordRepository,
            FoodRepository foodRepository,
            ExerciseRecordRepository exerciseRecordRepository,
            ExerciseRepository exerciseRepository
    ) {
        this.userProfileRepository = userProfileRepository;
        this.mealRecordRepository = mealRecordRepository;
        this.foodRepository = foodRepository;
        this.exerciseRecordRepository = exerciseRecordRepository;
        this.exerciseRepository = exerciseRepository;
    }

    public UserResponse create(CreateUserRequest request) {
        UserProfile user = new UserProfile(
                normalizeNameForCreate(request.name()),
                request.gender(),
                request.birthDate(),
                request.height(),
                request.activityLevel(),
                request.dailyCalorieTarget(),
                request.currentWeight(),
                request.targetWeight(),
                request.customBmr()
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

    public UserResponse update(Long id, UpdateUserRequest request) {
        UserProfile user = getUser(id);
        user.updateProfile(
                resolveNameForUpdate(request.name(), user.getName()),
                request.gender(),
                request.birthDate(),
                request.height(),
                request.activityLevel(),
                request.dailyCalorieTarget(),
                request.currentWeight(),
                request.targetWeight(),
                request.customBmr()
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
        BigDecimal remaining = BigDecimal.valueOf(user.getDailyCalorieTarget()).subtract(netCalories)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal proteinIntake = sumNutrient(mealRecords, foods, Food::getProteinPer100g);
        BigDecimal carbsIntake = sumNutrient(mealRecords, foods, Food::getCarbsPer100g);
        BigDecimal fatIntake = sumNutrient(mealRecords, foods, Food::getFatPer100g);

        List<DailyRecordResponse> records = Stream.concat(
                        mealRecords.stream().map(record -> toDietDailyRecord(record, foods.get(record.getFoodId()))),
                        exerciseRecords.stream().map(record -> toExerciseDailyRecord(record, exercises.get(record.getExerciseId())))
                )
                .sorted(Comparator.comparing(DailyRecordResponse::createdAt, Comparator.nullsLast(LocalDateTime::compareTo)).reversed())
                .toList();

        List<MealProgressResponse> mealProgress = buildMealProgress(user.getDailyCalorieTarget(), mealRecords);
        MealType topIssueMealType = resolveTopIssueMealType(user.getDailyCalorieTarget(), mealRecords, date, date);
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
                user.getDailyCalorieTarget(),
                dietCalories,
                exerciseCalories,
                netCalories,
                netCalories,
                remaining,
                remaining.compareTo(BigDecimal.ZERO) < 0,
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

        BigDecimal totalGap = trend.stream()
                .map(ProgressPointResponse::calorieGap)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal averageGap = trend.isEmpty()
                ? BigDecimal.ZERO
                : totalGap.divide(BigDecimal.valueOf(trend.size()), 2, RoundingMode.HALF_UP);

        int exerciseDays = (int) exerciseRecords.stream()
                .map(ExerciseRecord::getRecordDate)
                .distinct()
                .count();

        MealType topExceededMealType = resolveTopIssueMealType(user.getDailyCalorieTarget(), mealRecords, startDate, endDate);

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
        BigDecimal gap = BigDecimal.valueOf(user.getDailyCalorieTarget()).subtract(netCalories)
                .setScale(2, RoundingMode.HALF_UP);

        return new ProgressPointResponse(date, netCalories, user.getDailyCalorieTarget(), gap);
    }

    private List<MealProgressResponse> buildMealProgress(Integer dailyTargetCalories, List<MealRecord> mealRecords) {
        EnumMap<MealType, BigDecimal> intakeByMeal = new EnumMap<>(MealType.class);
        for (MealType mealType : MealType.values()) {
            intakeByMeal.put(mealType, BigDecimal.ZERO);
        }

        for (MealRecord mealRecord : mealRecords) {
            intakeByMeal.merge(mealRecord.getMealType(), mealRecord.getTotalCalories(), BigDecimal::add);
        }

        return List.of(MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER, MealType.SNACK)
                .stream()
                .map(mealType -> {
                    BigDecimal intake = intakeByMeal.getOrDefault(mealType, BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal target = BigDecimal.valueOf(dailyTargetCalories)
                            .multiply(MEAL_TARGET_RATIO.get(mealType))
                            .setScale(2, RoundingMode.HALF_UP);
                    BigDecimal remaining = target.subtract(intake).setScale(2, RoundingMode.HALF_UP);

                    return new MealProgressResponse(
                            mealType,
                            MEAL_LABELS.get(mealType),
                            intake,
                            target,
                            remaining,
                            remaining.compareTo(BigDecimal.ZERO) < 0,
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
        EnumMap<MealType, BigDecimal> overflowMap = new EnumMap<>(MealType.class);
        for (MealType mealType : MealType.values()) {
            overflowMap.put(mealType, BigDecimal.ZERO);
        }

        Map<LocalDate, List<MealRecord>> recordsByDate = mealRecords.stream()
                .collect(Collectors.groupingBy(MealRecord::getRecordDate, LinkedHashMap::new, Collectors.toList()));

        startDate.datesUntil(endDate.plusDays(1)).forEach(date -> {
            List<MealRecord> sameDayRecords = recordsByDate.getOrDefault(date, List.of());
            for (MealType mealType : MealType.values()) {
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
        int recordedMeals = (int) mealProgress.stream().filter(MealProgressResponse::recorded).count();
        double completeness = BigDecimal.valueOf(recordedMeals)
                .divide(BigDecimal.valueOf(mealProgress.size()), 2, RoundingMode.HALF_UP)
                .doubleValue();

        List<ActionSuggestionResponse> suggestions = new ArrayList<>();
        MealProgressResponse firstMissingMeal = mealProgress.stream()
                .filter(progress -> !progress.recorded())
                .findFirst()
                .orElse(null);
        if (firstMissingMeal != null) {
            suggestions.add(new ActionSuggestionResponse(
                    "RECORD_MEAL",
                    "补齐记录",
                    "你还未记录" + firstMissingMeal.mealLabel() + "，建议及时补充。",
                    firstMissingMeal.mealType()
            ));
        }

        if (remainingCalories.compareTo(BigDecimal.ZERO) < 0 && topIssueMealType != null) {
            suggestions.add(new ActionSuggestionResponse(
                    "CONTROL_MEAL",
                    "重点控制餐次",
                    MEAL_LABELS.get(topIssueMealType) + "是今日超标主因，下一餐建议清淡一些。",
                    topIssueMealType
            ));
        }

        if (proteinIntake.compareTo(BigDecimal.valueOf(60)) < 0 && suggestions.size() < 2) {
            suggestions.add(new ActionSuggestionResponse(
                    "PROTEIN",
                    "补充蛋白质",
                    "今日蛋白质摄入偏低，可适量增加鸡蛋、牛奶或豆制品。",
                    null
            ));
        }

        String summaryText;
        if (noRecords) {
            summaryText = "今天还没有记录，先从当前这一餐开始吧。";
        } else if (remainingCalories.compareTo(BigDecimal.ZERO) < 0) {
            String mealTip = topIssueMealType == null ? "" : ("，主要来自" + MEAL_LABELS.get(topIssueMealType));
            summaryText = "今日已超目标 " + remainingCalories.abs().setScale(0, RoundingMode.HALF_UP).toPlainString()
                    + " kcal" + mealTip + "。";
        } else if (completeness >= 0.75) {
            summaryText = "今日热量控制稳定，记录完成度较高，继续保持。";
        } else {
            summaryText = "今日已记录 " + totalRecords + " 条，继续补齐剩余餐次会更准确。";
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

        MealType topExceededMealType = resolveTopIssueMealType(user.getDailyCalorieTarget(), mealRecords, startDate, date);

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
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getGender(),
                user.getBirthDate(),
                user.calculateAge(),
                user.getHeight(),
                user.getActivityLevel(),
                user.getDailyCalorieTarget(),
                user.getCurrentWeight(),
                user.getTargetWeight(),
                user.getCustomBmr(),
                user.calculateBmi(),
                user.calculateBmr(),
                user.calculateTdee(),
                user.getCreatedAt()
        );
    }

    private String normalizeNameForCreate(String name) {
        if (name == null || name.isBlank()) {
            return DEFAULT_NAME;
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
}
