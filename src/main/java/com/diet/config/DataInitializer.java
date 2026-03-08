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
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedData(
            UserProfileRepository userProfileRepository,
            FoodRepository foodRepository,
            MealRecordRepository mealRecordRepository,
            JdbcTemplate jdbcTemplate
    ) {
        return args -> {
            migrateUserProfileTable(jdbcTemplate);

            long userCount = userProfileRepository.count();
            long foodCount = foodRepository.count();
            long recordCount = mealRecordRepository.count();
            if (userCount > 0 || foodCount > 0 || recordCount > 0) {
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

            Food chickenBreast = new Food(
                    "鸡胸肉",
                    new BigDecimal("133"),
                    new BigDecimal("24.00"),
                    new BigDecimal("0.00"),
                    new BigDecimal("5.00"),
                    "高蛋白"
            );
            foodRepository.save(chickenBreast);

            Food oatmeal = new Food(
                    "燕麦片",
                    new BigDecimal("389"),
                    new BigDecimal("16.90"),
                    new BigDecimal("66.30"),
                    new BigDecimal("6.90"),
                    "主食"
            );
            foodRepository.save(oatmeal);

            Food broccoli = new Food(
                    "西兰花",
                    new BigDecimal("34"),
                    new BigDecimal("2.80"),
                    new BigDecimal("6.60"),
                    new BigDecimal("0.40"),
                    "蔬菜"
            );
            foodRepository.save(broccoli);

            mealRecordRepository.save(new MealRecord(
                    user.getId(),
                    oatmeal.getId(),
                    MealType.BREAKFAST,
                    new BigDecimal("80"),
                    new BigDecimal("311.20"),
                    LocalDate.now()
            ));
            mealRecordRepository.save(new MealRecord(
                    user.getId(),
                    chickenBreast.getId(),
                    MealType.LUNCH,
                    new BigDecimal("200"),
                    new BigDecimal("266.00"),
                    LocalDate.now()
            ));
            mealRecordRepository.save(new MealRecord(
                    user.getId(),
                    broccoli.getId(),
                    MealType.DINNER,
                    new BigDecimal("150"),
                    new BigDecimal("51.00"),
                    LocalDate.now()
            ));
        };
    }

    private void migrateUserProfileTable(JdbcTemplate jdbcTemplate) {
        ensureNullableEmail(jdbcTemplate);
        ensureColumn(jdbcTemplate, "gender", "ALTER TABLE user_profile ADD COLUMN gender VARCHAR(10) NOT NULL DEFAULT 'FEMALE'");
        ensureColumn(jdbcTemplate, "birth_date", "ALTER TABLE user_profile ADD COLUMN birth_date DATE NULL");
        ensureColumn(jdbcTemplate, "height", "ALTER TABLE user_profile ADD COLUMN height DECIMAL(5, 2) NOT NULL DEFAULT 165.00");
        ensureColumn(jdbcTemplate, "activity_level", "ALTER TABLE user_profile ADD COLUMN activity_level VARCHAR(20) NOT NULL DEFAULT 'LIGHT'");
        ensureColumn(jdbcTemplate, "custom_bmr", "ALTER TABLE user_profile ADD COLUMN custom_bmr INT NULL COMMENT '用户自定义基础代谢，单位 kcal'");
        backfillBirthDate(jdbcTemplate);
    }

    private void ensureNullableEmail(JdbcTemplate jdbcTemplate) {
        if (!hasColumn(jdbcTemplate, "email")) {
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
        if (!hasColumn(jdbcTemplate, "birth_date")) {
            return;
        }
        boolean hasAgeColumn = hasColumn(jdbcTemplate, "age");
        if (hasAgeColumn) {
            jdbcTemplate.execute("UPDATE user_profile SET birth_date = DATE_SUB(CURDATE(), INTERVAL age YEAR) WHERE birth_date IS NULL AND age IS NOT NULL");
        }
        jdbcTemplate.execute("UPDATE user_profile SET birth_date = '2000-01-01' WHERE birth_date IS NULL");
        jdbcTemplate.execute("ALTER TABLE user_profile MODIFY COLUMN birth_date DATE NOT NULL");
    }

    private void ensureColumn(JdbcTemplate jdbcTemplate, String columnName, String sql) {
        if (!hasColumn(jdbcTemplate, columnName)) {
            jdbcTemplate.execute(sql);
        }
    }

    private boolean hasColumn(JdbcTemplate jdbcTemplate, String columnName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_profile' AND COLUMN_NAME = ?",
                Integer.class,
                columnName
        );
        return count != null && count > 0;
    }
}