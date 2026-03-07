package com.diet.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.diet.food.Food;
import com.diet.food.FoodRepository;
import com.diet.record.MealRecord;
import com.diet.record.MealRecordRepository;
import com.diet.record.MealType;
import com.diet.user.UserProfile;
import com.diet.user.UserProfileRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedData(UserProfileRepository userProfileRepository,
                               FoodRepository foodRepository,
                               MealRecordRepository mealRecordRepository) {
        return args -> {
            Long userCount = userProfileRepository.selectCount(null);
            Long foodCount = foodRepository.selectCount(null);
            Long recordCount = mealRecordRepository.selectCount(null);
            if (userCount > 0 || foodCount > 0 || recordCount > 0) {
                return;
            }

            UserProfile user = new UserProfile(
                    "Demo User",
                    "demo@example.com",
                    1800,
                    new BigDecimal("78.50"),
                    new BigDecimal("70.00")
            );
            userProfileRepository.insert(user);

            Food chickenBreast = new Food(
                    "Chicken Breast",
                    new BigDecimal("133"),
                    new BigDecimal("24.00"),
                    new BigDecimal("0.00"),
                    new BigDecimal("5.00"),
                    "Protein"
            );
            foodRepository.insert(chickenBreast);

            Food oatmeal = new Food(
                    "Oatmeal",
                    new BigDecimal("389"),
                    new BigDecimal("16.90"),
                    new BigDecimal("66.30"),
                    new BigDecimal("6.90"),
                    "Carbs"
            );
            foodRepository.insert(oatmeal);

            Food broccoli = new Food(
                    "Broccoli",
                    new BigDecimal("34"),
                    new BigDecimal("2.80"),
                    new BigDecimal("6.60"),
                    new BigDecimal("0.40"),
                    "Vegetable"
            );
            foodRepository.insert(broccoli);

            mealRecordRepository.insert(new MealRecord(
                    user.getId(),
                    oatmeal.getId(),
                    MealType.BREAKFAST,
                    new BigDecimal("80"),
                    new BigDecimal("311.20"),
                    LocalDate.now()
            ));
            mealRecordRepository.insert(new MealRecord(
                    user.getId(),
                    chickenBreast.getId(),
                    MealType.LUNCH,
                    new BigDecimal("200"),
                    new BigDecimal("266.00"),
                    LocalDate.now()
            ));
            mealRecordRepository.insert(new MealRecord(
                    user.getId(),
                    broccoli.getId(),
                    MealType.DINNER,
                    new BigDecimal("150"),
                    new BigDecimal("51.00"),
                    LocalDate.now()
            ));
        };
    }
}