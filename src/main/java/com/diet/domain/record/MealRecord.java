package com.diet.domain.record;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@TableName("meal_record")
public class MealRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("user_id")
    private Long userId;

    @TableField("food_id")
    private Long foodId;

    @TableField("meal_type")
    private MealType mealType;

    @TableField("quantity_in_gram")
    private BigDecimal quantityInGram;

    @TableField("total_calories")
    private BigDecimal totalCalories;

    @TableField("record_date")
    private LocalDate recordDate;

    @TableField("created_at")
    private LocalDateTime createdAt;

    public MealRecord(
            Long userId,
            Long foodId,
            MealType mealType,
            BigDecimal quantityInGram,
            BigDecimal totalCalories,
            LocalDate recordDate
    ) {
        this.userId = userId;
        this.foodId = foodId;
        this.mealType = mealType;
        this.quantityInGram = quantityInGram;
        this.totalCalories = totalCalories;
        this.recordDate = recordDate;
        this.createdAt = LocalDateTime.now();
    }

    public static BigDecimal calculateTotalCalories(BigDecimal caloriesPer100g, BigDecimal quantityInGram) {
        return caloriesPer100g.multiply(quantityInGram)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }
}
