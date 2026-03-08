package com.diet.config;

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
            JdbcTemplate jdbcTemplate
    ) {
        return args -> {
            migrateUserProfileTable(jdbcTemplate);
            migrateFoodTable(jdbcTemplate);
            seedBuiltinFoodsIfNeeded(foodRepository, jdbcTemplate);
            seedDemoDataIfNeeded(userProfileRepository, foodRepository, mealRecordRepository);
        };
    }

    private void seedBuiltinFoodsIfNeeded(FoodRepository foodRepository, JdbcTemplate jdbcTemplate) {
        if (foodRepository.count() >= 300) {
            return;
        }

        ResourceDatabasePopulator populator = new ResourceDatabasePopulator(new ClassPathResource("builtin_food_seed.sql"));
        populator.setContinueOnError(false);
        DatabasePopulatorUtils.execute(populator, jdbcTemplate.getDataSource());
    }

    private void seedDemoDataIfNeeded(
            UserProfileRepository userProfileRepository,
            FoodRepository foodRepository,
            MealRecordRepository mealRecordRepository
    ) {
        if (!demoSeedEnabled) {
            return;
        }

        if (userProfileRepository.count() > 0 || mealRecordRepository.count() > 0) {
            return;
        }

        UserProfile user = new UserProfile(
                "微信用户",
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

        Food rice = foodRepository.findByNameIgnoreCase("米饭（熟）").orElse(null);
        Food chicken = foodRepository.findByNameIgnoreCase("鸡胸肉（熟）").orElse(null);
        Food broccoli = foodRepository.findByNameIgnoreCase("西兰花").orElse(null);
        if (rice == null || chicken == null || broccoli == null) {
            return;
        }

        mealRecordRepository.save(new MealRecord(
                user.getId(),
                rice.getId(),
                MealType.BREAKFAST,
                new BigDecimal("120"),
                MealRecord.calculateTotalCalories(rice.getCaloriesPer100g(), new BigDecimal("120")),
                LocalDate.now()
        ));
        mealRecordRepository.save(new MealRecord(
                user.getId(),
                chicken.getId(),
                MealType.LUNCH,
                new BigDecimal("180"),
                MealRecord.calculateTotalCalories(chicken.getCaloriesPer100g(), new BigDecimal("180")),
                LocalDate.now()
        ));
        mealRecordRepository.save(new MealRecord(
                user.getId(),
                broccoli.getId(),
                MealType.DINNER,
                new BigDecimal("200"),
                MealRecord.calculateTotalCalories(broccoli.getCaloriesPer100g(), new BigDecimal("200")),
                LocalDate.now()
        ));
    }

    private void migrateUserProfileTable(JdbcTemplate jdbcTemplate) {
        ensureNullableEmail(jdbcTemplate);
        ensureColumn(jdbcTemplate, "user_profile", "gender", "ALTER TABLE user_profile ADD COLUMN gender VARCHAR(10) NOT NULL DEFAULT 'FEMALE'");
        ensureColumn(jdbcTemplate, "user_profile", "birth_date", "ALTER TABLE user_profile ADD COLUMN birth_date DATE NULL");
        ensureColumn(jdbcTemplate, "user_profile", "height", "ALTER TABLE user_profile ADD COLUMN height DECIMAL(5, 2) NOT NULL DEFAULT 165.00");
        ensureColumn(jdbcTemplate, "user_profile", "activity_level", "ALTER TABLE user_profile ADD COLUMN activity_level VARCHAR(20) NOT NULL DEFAULT 'LIGHT'");
        ensureColumn(jdbcTemplate, "user_profile", "custom_bmr", "ALTER TABLE user_profile ADD COLUMN custom_bmr INT NULL COMMENT '用户自定义基础代谢，单位 kcal'");
        ensureColumn(jdbcTemplate, "user_profile", "open_id", "ALTER TABLE user_profile ADD COLUMN open_id VARCHAR(64) NULL COMMENT '微信 openid'");
        ensureColumn(jdbcTemplate, "user_profile", "union_id", "ALTER TABLE user_profile ADD COLUMN union_id VARCHAR(64) NULL COMMENT '微信 unionid'");
        ensureColumn(jdbcTemplate, "user_profile", "nickname", "ALTER TABLE user_profile ADD COLUMN nickname VARCHAR(80) NULL COMMENT '微信昵称'");
        ensureColumn(jdbcTemplate, "user_profile", "avatar_url", "ALTER TABLE user_profile ADD COLUMN avatar_url VARCHAR(300) NULL COMMENT '微信头像地址'");
        ensureColumn(jdbcTemplate, "user_profile", "last_login_at", "ALTER TABLE user_profile ADD COLUMN last_login_at DATETIME NULL COMMENT '最近登录时间'");
        ensureIndex(
                jdbcTemplate,
                "user_profile",
                "uk_user_profile_open_id",
                "CREATE UNIQUE INDEX uk_user_profile_open_id ON user_profile(open_id)"
        );
        backfillBirthDate(jdbcTemplate);
    }

    private void migrateFoodTable(JdbcTemplate jdbcTemplate) {
        ensureColumn(jdbcTemplate, "food", "source", "ALTER TABLE food ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'MANUAL' COMMENT '数据来源' AFTER category");
        ensureColumn(jdbcTemplate, "food", "source_ref", "ALTER TABLE food ADD COLUMN source_ref VARCHAR(100) NULL COMMENT '来源数据主键' AFTER source");
        ensureColumn(jdbcTemplate, "food", "aliases", "ALTER TABLE food ADD COLUMN aliases VARCHAR(500) NULL COMMENT '同义词，逗号分隔' AFTER source_ref");
        ensureColumn(jdbcTemplate, "food", "is_builtin", "ALTER TABLE food ADD COLUMN is_builtin TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否内置食物' AFTER aliases");
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

    private void backfillBirthDate(JdbcTemplate jdbcTemplate) {
        if (!hasColumn(jdbcTemplate, "user_profile", "birth_date")) {
            return;
        }
        boolean hasAgeColumn = hasColumn(jdbcTemplate, "user_profile", "age");
        if (hasAgeColumn) {
            jdbcTemplate.execute("UPDATE user_profile SET birth_date = DATE_SUB(CURDATE(), INTERVAL age YEAR) WHERE birth_date IS NULL AND age IS NOT NULL");
        }
        jdbcTemplate.execute("UPDATE user_profile SET birth_date = '2000-01-01' WHERE birth_date IS NULL");
        jdbcTemplate.execute("ALTER TABLE user_profile MODIFY COLUMN birth_date DATE NOT NULL");
    }

    private void ensureColumn(JdbcTemplate jdbcTemplate, String tableName, String columnName, String sql) {
        if (!hasColumn(jdbcTemplate, tableName, columnName)) {
            jdbcTemplate.execute(sql);
        }
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
