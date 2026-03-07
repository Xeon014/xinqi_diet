package com.diet.record;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

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

    public MealRecord() {
    }

    public MealRecord(Long userId, Long foodId, MealType mealType, BigDecimal quantityInGram,
                      BigDecimal totalCalories, LocalDate recordDate) {
        this.userId = userId;
        this.foodId = foodId;
        this.mealType = mealType;
        this.quantityInGram = quantityInGram;
        this.totalCalories = totalCalories;
        this.recordDate = recordDate;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getFoodId() {
        return foodId;
    }

    public void setFoodId(Long foodId) {
        this.foodId = foodId;
    }

    public MealType getMealType() {
        return mealType;
    }

    public void setMealType(MealType mealType) {
        this.mealType = mealType;
    }

    public BigDecimal getQuantityInGram() {
        return quantityInGram;
    }

    public void setQuantityInGram(BigDecimal quantityInGram) {
        this.quantityInGram = quantityInGram;
    }

    public BigDecimal getTotalCalories() {
        return totalCalories;
    }

    public void setTotalCalories(BigDecimal totalCalories) {
        this.totalCalories = totalCalories;
    }

    public LocalDate getRecordDate() {
        return recordDate;
    }

    public void setRecordDate(LocalDate recordDate) {
        this.recordDate = recordDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}