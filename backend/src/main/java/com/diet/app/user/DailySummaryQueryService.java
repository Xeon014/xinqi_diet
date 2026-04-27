package com.diet.app.user;

import com.diet.app.record.exercise.ExerciseRecordQueryService;
import com.diet.app.record.meal.MealRecordQueryService;
import com.diet.domain.exercise.Exercise;
import com.diet.domain.exercise.ExerciseRecord;
import com.diet.domain.exercise.ExerciseRepository;
import com.diet.domain.food.Food;
import com.diet.domain.food.FoodQuantityUnit;
import com.diet.domain.food.FoodRepository;
import com.diet.domain.record.MealRecord;
import com.diet.domain.record.MealType;
import com.diet.domain.user.UserProfile;
import com.diet.types.common.NotFoundException;
import com.diet.api.user.ActionSuggestionResponse;
import com.diet.api.user.DailyInsightResponse;
import com.diet.api.user.DailyRecordResponse;
import com.diet.api.user.DailyRecordType;
import com.diet.api.user.DailySummaryResponse;
import com.diet.api.user.MealProgressResponse;
import com.diet.api.user.TrendInsightResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DailySummaryQueryService {

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

    private static final List<MealType> MEAL_PROGRESS_ORDER = List.of(
            MealType.BREAKFAST,
            MealType.MORNING_SNACK,
            MealType.LUNCH,
            MealType.AFTERNOON_SNACK,
            MealType.DINNER,
            MealType.LATE_NIGHT_SNACK,
            MealType.OTHER
    );

    private final FoodRepository foodRepository;

    private final ExerciseRepository exerciseRepository;

    private final UserProfileSupport userProfileSupport;

    private final ProgressQueryService progressQueryService;

    private final MealRecordQueryService mealRecordQueryService;

    private final ExerciseRecordQueryService exerciseRecordQueryService;

    public DailySummaryQueryService(
            FoodRepository foodRepository,
            ExerciseRepository exerciseRepository,
            UserProfileSupport userProfileSupport,
            ProgressQueryService progressQueryService,
            MealRecordQueryService mealRecordQueryService,
            ExerciseRecordQueryService exerciseRecordQueryService
    ) {
        this.foodRepository = foodRepository;
        this.exerciseRepository = exerciseRepository;
        this.userProfileSupport = userProfileSupport;
        this.progressQueryService = progressQueryService;
        this.mealRecordQueryService = mealRecordQueryService;
        this.exerciseRecordQueryService = exerciseRecordQueryService;
    }

    public DailySummaryResponse getDailySummary(Long userId, LocalDate date) {
        UserProfile user = userProfileSupport.getUser(userId);

        List<MealRecord> mealRecords = mealRecordQueryService.findRecordsByUserAndDate(userId, date);
        List<ExerciseRecord> exerciseRecords = exerciseRecordQueryService.findRecordsByUserAndDate(userId, date);

        Map<Long, Food> foods = loadFoods(mealRecords);
        Map<Long, Exercise> exercises = loadExercises(exerciseRecords);

        BigDecimal dietCalories = sumDietCalories(mealRecords);
        BigDecimal exerciseCalories = sumExerciseCalories(exerciseRecords);
        BigDecimal netCalories = dietCalories.subtract(exerciseCalories).setScale(2, RoundingMode.HALF_UP);
        Integer targetCalories = userProfileSupport.resolveEffectiveTargetCalories(user);
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
        MealType topIssueMealType = progressQueryService.resolveTopIssueMealType(targetCalories, mealRecords, date, date);
        DailyInsightResponse dailyInsight = buildDailyInsight(
                remaining,
                topIssueMealType,
                mealProgress,
                proteinIntake,
                mealRecords.isEmpty(),
                records.size()
        );
        TrendInsightResponse trendInsight = progressQueryService.getTrendInsight(user, date);

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
                    "补记餐次",
                    "可以先补记" + firstMissingMeal.mealLabel() + "，让今天的记录更完整",
                    firstMissingMeal.mealType()
            ));
        }

        if (remainingCalories != null && remainingCalories.compareTo(BigDecimal.ZERO) < 0 && topIssueMealType != null) {
            suggestions.add(new ActionSuggestionResponse(
                    "CONTROL_MEAL",
                    "控制热量",
                    MEAL_LABELS.get(topIssueMealType) + "热量偏高，下一餐可以清淡一些",
                    topIssueMealType
            ));
        }

        if (proteinIntake.compareTo(BigDecimal.valueOf(60)) < 0 && suggestions.size() < 2) {
            suggestions.add(new ActionSuggestionResponse(
                    "PROTEIN",
                    "补充蛋白",
                    "今天蛋白质偏低，可以优先选择蛋类、奶类或瘦肉",
                    null
            ));
        }

        String summaryText = "";
        if (remainingCalories == null) {
            summaryText = "还没有设置目标热量，先完成今天记录";
        } else if (remainingCalories.compareTo(BigDecimal.ZERO) < 0) {
            summaryText = "已超出目标 " + remainingCalories.abs().setScale(0, RoundingMode.HALF_UP).toPlainString() + " kcal";
        } else if (completeness >= 0.75) {
            summaryText = "今天记录比较完整，继续保持节奏";
        }

        return new DailyInsightResponse(summaryText, topIssueMealType, completeness, suggestions.stream().limit(2).toList());
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

    private Food getFood(Long id) {
        return foodRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("food not found, id=" + id));
    }

    private Exercise getExercise(Long id) {
        return exerciseRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("exercise not found, id=" + id));
    }
}
