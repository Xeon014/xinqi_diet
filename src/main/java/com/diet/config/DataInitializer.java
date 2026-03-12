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
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
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
            migrateUserProfileTable(jdbcTemplate);
            migrateFoodTable(jdbcTemplate);
            migrateExerciseTable(jdbcTemplate);
            migrateHealthDiaryTable(jdbcTemplate);
            migrateBodyMetricRecordTable(jdbcTemplate);
            seedBuiltinFoodsIfNeeded(foodRepository, jdbcTemplate);
            seedBuiltinExercisesIfNeeded(exerciseRepository, jdbcTemplate);
            backfillFoodSortOrder(jdbcTemplate);
            seedDemoDataIfNeeded(userProfileRepository, foodRepository, mealRecordRepository, exerciseRecordRepository);
        };
    }

    private void seedBuiltinFoodsIfNeeded(FoodRepository foodRepository, JdbcTemplate jdbcTemplate) {
        if (foodRepository.count() >= 300) {
            return;
        }
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
                1350
        );
        userProfileRepository.save(user);

        List<Food> foods = foodRepository.findAll(null);
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

    private void migrateUserProfileTable(JdbcTemplate jdbcTemplate) {
        ensureNullableEmail(jdbcTemplate);
        ensureColumn(jdbcTemplate, "user_profile", "name", "ALTER TABLE user_profile ADD COLUMN name VARCHAR(50) NULL");
        ensureColumn(jdbcTemplate, "user_profile", "gender", "ALTER TABLE user_profile ADD COLUMN gender VARCHAR(10) NULL");
        ensureColumn(jdbcTemplate, "user_profile", "birth_date", "ALTER TABLE user_profile ADD COLUMN birth_date DATE NULL");
        ensureColumn(jdbcTemplate, "user_profile", "height", "ALTER TABLE user_profile ADD COLUMN height DECIMAL(5, 2) NULL");
        ensureColumn(jdbcTemplate, "user_profile", "activity_level", "ALTER TABLE user_profile ADD COLUMN activity_level VARCHAR(20) NULL");
        ensureColumn(jdbcTemplate, "user_profile", "daily_calorie_target", "ALTER TABLE user_profile ADD COLUMN daily_calorie_target INT NULL");
        ensureColumn(jdbcTemplate, "user_profile", "current_weight", "ALTER TABLE user_profile ADD COLUMN current_weight DECIMAL(5, 2) NULL");
        ensureColumn(jdbcTemplate, "user_profile", "target_weight", "ALTER TABLE user_profile ADD COLUMN target_weight DECIMAL(5, 2) NULL");
        ensureColumn(jdbcTemplate, "user_profile", "custom_bmr", "ALTER TABLE user_profile ADD COLUMN custom_bmr INT NULL COMMENT 'custom bmr in kcal'");
        ensureColumn(jdbcTemplate, "user_profile", "open_id", "ALTER TABLE user_profile ADD COLUMN open_id VARCHAR(64) NULL COMMENT 'wechat openid'");
        ensureColumn(jdbcTemplate, "user_profile", "union_id", "ALTER TABLE user_profile ADD COLUMN union_id VARCHAR(64) NULL COMMENT 'wechat unionid'");
        ensureColumn(jdbcTemplate, "user_profile", "nickname", "ALTER TABLE user_profile ADD COLUMN nickname VARCHAR(80) NULL COMMENT 'wechat nickname'");
        ensureColumn(jdbcTemplate, "user_profile", "avatar_url", "ALTER TABLE user_profile ADD COLUMN avatar_url VARCHAR(300) NULL COMMENT 'wechat avatar url'");
        ensureColumn(jdbcTemplate, "user_profile", "last_login_at", "ALTER TABLE user_profile ADD COLUMN last_login_at DATETIME NULL COMMENT 'last login at'");
        ensureIndex(
                jdbcTemplate,
                "user_profile",
                "uk_user_profile_open_id",
                "CREATE UNIQUE INDEX uk_user_profile_open_id ON user_profile(open_id)"
        );
        ensureNullableColumn(jdbcTemplate, "user_profile", "name", "VARCHAR(50)");
        ensureNullableColumn(jdbcTemplate, "user_profile", "gender", "VARCHAR(10)");
        ensureNullableColumn(jdbcTemplate, "user_profile", "birth_date", "DATE");
        ensureNullableColumn(jdbcTemplate, "user_profile", "height", "DECIMAL(5, 2)");
        ensureNullableColumn(jdbcTemplate, "user_profile", "activity_level", "VARCHAR(20)");
        ensureNullableColumn(jdbcTemplate, "user_profile", "daily_calorie_target", "INT");
        ensureNullableColumn(jdbcTemplate, "user_profile", "current_weight", "DECIMAL(5, 2)");
        ensureNullableColumn(jdbcTemplate, "user_profile", "target_weight", "DECIMAL(5, 2)");
        ensureNullableColumn(jdbcTemplate, "user_profile", "custom_bmr", "INT");
    }

    private void migrateFoodTable(JdbcTemplate jdbcTemplate) {
        ensureColumn(jdbcTemplate, "food", "source", "ALTER TABLE food ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'MANUAL' COMMENT 'data source' AFTER category");
        ensureColumn(jdbcTemplate, "food", "source_ref", "ALTER TABLE food ADD COLUMN source_ref VARCHAR(100) NULL COMMENT 'source ref id' AFTER source");
        ensureColumn(jdbcTemplate, "food", "aliases", "ALTER TABLE food ADD COLUMN aliases VARCHAR(500) NULL COMMENT 'aliases' AFTER source_ref");
        ensureColumn(jdbcTemplate, "food", "is_builtin", "ALTER TABLE food ADD COLUMN is_builtin TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'is builtin' AFTER aliases");
        ensureColumn(jdbcTemplate, "food", "sort_order", "ALTER TABLE food ADD COLUMN sort_order INT NOT NULL DEFAULT 9999 COMMENT 'category sort order' AFTER is_builtin");
        ensureIndex(
                jdbcTemplate,
                "food",
                "idx_food_category_sort",
                "CREATE INDEX idx_food_category_sort ON food(category, sort_order, id)"
        );
    }

    private void migrateExerciseTable(JdbcTemplate jdbcTemplate) {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS exercise (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(80) NOT NULL,
                    met_value DECIMAL(8, 2) NOT NULL,
                    category VARCHAR(80) NULL,
                    source VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
                    source_ref VARCHAR(100) NULL,
                    aliases VARCHAR(500) NULL,
                    is_builtin TINYINT(1) NOT NULL DEFAULT 0,
                    sort_order INT NOT NULL DEFAULT 9999,
                    created_at DATETIME NOT NULL,
                    UNIQUE KEY uk_exercise_name (name),
                    KEY idx_exercise_category_sort (category, sort_order, id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """);

        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS exercise_record (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    user_id BIGINT NOT NULL,
                    exercise_id BIGINT NOT NULL,
                    duration_minutes INT NOT NULL,
                    intensity_level VARCHAR(20) NOT NULL,
                    intensity_factor DECIMAL(5, 2) NOT NULL,
                    weight_kg_snapshot DECIMAL(6, 2) NOT NULL,
                    total_calories DECIMAL(10, 2) NOT NULL,
                    record_date DATE NOT NULL,
                    created_at DATETIME NOT NULL,
                    KEY idx_exercise_record_user_date (user_id, record_date),
                    KEY idx_exercise_record_exercise (exercise_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """);
    }

    private void migrateHealthDiaryTable(JdbcTemplate jdbcTemplate) {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS health_diary (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    user_id BIGINT NOT NULL,
                    record_date DATE NOT NULL,
                    content VARCHAR(500) NULL,
                    image_file_ids TEXT NULL,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    UNIQUE KEY uk_health_diary_user_date (user_id, record_date),
                    KEY idx_health_diary_user_date (user_id, record_date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """);
    }

    private void migrateBodyMetricRecordTable(JdbcTemplate jdbcTemplate) {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS body_metric_record (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    user_id BIGINT NOT NULL,
                    metric_type VARCHAR(20) NOT NULL,
                    metric_value DECIMAL(10, 2) NOT NULL,
                    unit VARCHAR(20) NOT NULL,
                    record_date DATE NOT NULL,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    KEY idx_body_metric_user_type_date (user_id, metric_type, record_date, id),
                    KEY idx_body_metric_user_created (user_id, created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """);
    }

    private void backfillFoodSortOrder(JdbcTemplate jdbcTemplate) {
        if (!hasColumn(jdbcTemplate, "food", "sort_order")) {
            return;
        }
        jdbcTemplate.execute("UPDATE food SET sort_order = 9999 WHERE sort_order IS NULL");
    }

    private void ensureNullableEmail(JdbcTemplate jdbcTemplate) {
        if (!hasColumn(jdbcTemplate, "user_profile", "email")) {
            return;
        }
        String isNullable = jdbcTemplate.queryForObject(
                "SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_profile' AND COLUMN_NAME = 'email'",
                String.class
        );
        if ("NO".equalsIgnoreCase(isNullable)) {
            jdbcTemplate.execute("ALTER TABLE user_profile MODIFY COLUMN email VARCHAR(100) NULL");
        }
    }

    private void ensureColumn(JdbcTemplate jdbcTemplate, String tableName, String columnName, String sql) {
        if (!hasColumn(jdbcTemplate, tableName, columnName)) {
            jdbcTemplate.execute(sql);
        }
    }

    private void ensureNullableColumn(JdbcTemplate jdbcTemplate, String tableName, String columnName, String columnType) {
        if (!hasColumn(jdbcTemplate, tableName, columnName)) {
            return;
        }
        Map<String, Object> columnInfo = jdbcTemplate.queryForMap(
                "SELECT IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
                tableName,
                columnName
        );
        String isNullable = String.valueOf(columnInfo.getOrDefault("IS_NULLABLE", "NO"));
        Object columnDefault = columnInfo.get("COLUMN_DEFAULT");
        if ("YES".equalsIgnoreCase(isNullable) && columnDefault == null) {
            return;
        }
        jdbcTemplate.execute("ALTER TABLE " + tableName + " MODIFY COLUMN " + columnName + " " + columnType + " NULL");
    }

    private void ensureIndex(JdbcTemplate jdbcTemplate, String tableName, String indexName, String sql) {
        if (!hasIndex(jdbcTemplate, tableName, indexName)) {
            jdbcTemplate.execute(sql);
        }
    }

    private boolean hasColumn(JdbcTemplate jdbcTemplate, String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
                Integer.class,
                tableName,
                columnName
        );
        return count != null && count > 0;
    }

    private boolean hasIndex(JdbcTemplate jdbcTemplate, String tableName, String indexName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?",
                Integer.class,
                tableName,
                indexName
        );
        return count != null && count > 0;
    }
}
