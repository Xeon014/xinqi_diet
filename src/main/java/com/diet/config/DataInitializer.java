package com.diet.config;

import com.diet.domain.exercise.ExerciseRepository;
import com.diet.domain.exercise.ExerciseRecordRepository;
import com.diet.domain.food.Food;
import com.diet.domain.food.FoodRepository;
import com.diet.domain.record.MealRecord;
import com.diet.domain.record.MealRecordRepository;
import com.diet.domain.record.MealType;
import com.diet.domain.user.ActivityLevel;
import com.diet.domain.user.Gender;
import com.diet.domain.user.GoalCalorieStrategy;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.DatabasePopulatorUtils;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;

@Configuration
public class DataInitializer {

    @Value("${app.demo-seed-enabled:false}")
    private boolean demoSeedEnabled;

    @Bean
    CommandLineRunner seedData(
            UserProfileRepository userProfileRepository,
            FoodRepository foodRepository,
            MealRecordRepository mealRecordRepository,
            ExerciseRepository exerciseRepository,
            ExerciseRecordRepository exerciseRecordRepository,
            JdbcTemplate jdbcTemplate
    ) {
        return args -> {
            seedBuiltinFoodsIfNeeded(jdbcTemplate);
            seedBuiltinExercisesIfNeeded(exerciseRepository, jdbcTemplate);
            seedDemoDataIfNeeded(userProfileRepository, foodRepository, mealRecordRepository, exerciseRecordRepository);
        };
    }

    private void seedBuiltinFoodsIfNeeded(JdbcTemplate jdbcTemplate) {
        importSql(jdbcTemplate, "builtin_food_seed.sql");
    }

    private void seedBuiltinExercisesIfNeeded(ExerciseRepository exerciseRepository, JdbcTemplate jdbcTemplate) {
        if (exerciseRepository.count() >= 60) {
            return;
        }
        importSql(jdbcTemplate, "builtin_exercise_seed.sql");
    }

    private void importSql(JdbcTemplate jdbcTemplate, String classpathSql) {
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator(new ClassPathResource(classpathSql));
        populator.setContinueOnError(false);
        DatabasePopulatorUtils.execute(populator, jdbcTemplate.getDataSource());
    }

    private void seedDemoDataIfNeeded(
            UserProfileRepository userProfileRepository,
            FoodRepository foodRepository,
            MealRecordRepository mealRecordRepository,
            ExerciseRecordRepository exerciseRecordRepository
    ) {
        if (!demoSeedEnabled) {
            return;
        }

        if (userProfileRepository.count() > 0 || mealRecordRepository.count() > 0 || exerciseRecordRepository.count() > 0) {
            return;
        }

        UserProfile user = new UserProfile(
                "Wechat User",
                Gender.FEMALE,
                LocalDate.of(1998, 5, 20),
                new BigDecimal("165.00"),
                ActivityLevel.LIGHT,
                1800,
                new BigDecimal("58.50"),
                new BigDecimal("52.00"),
                1350,
                null,
                null,
                null,
                null,
                GoalCalorieStrategy.MANUAL
        );
        userProfileRepository.save(user);

        List<Food> foods = foodRepository.findAll(null, null);
        if (foods.size() < 3) {
            return;
        }

        saveMealRecord(mealRecordRepository, user.getId(), foods.get(0), MealType.BREAKFAST, new BigDecimal("120"));
        saveMealRecord(mealRecordRepository, user.getId(), foods.get(1), MealType.LUNCH, new BigDecimal("180"));
        saveMealRecord(mealRecordRepository, user.getId(), foods.get(2), MealType.DINNER, new BigDecimal("200"));
    }

    private void saveMealRecord(
            MealRecordRepository mealRecordRepository,
            Long userId,
            Food food,
            MealType mealType,
            BigDecimal quantityInGram
    ) {
        mealRecordRepository.save(new MealRecord(
                userId,
                food.getId(),
                mealType,
                quantityInGram,
                MealRecord.calculateTotalCalories(food.getCaloriesPer100g(), quantityInGram),
                LocalDate.now()
        ));
    }
}
