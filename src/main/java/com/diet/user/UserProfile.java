package com.diet.user;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@TableName("user_profile")
public class UserProfile {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;

    private String email;

    @TableField("daily_calorie_target")
    private Integer dailyCalorieTarget;

    @TableField("current_weight")
    private BigDecimal currentWeight;

    @TableField("target_weight")
    private BigDecimal targetWeight;

    @TableField("created_at")
    private LocalDateTime createdAt;

    public UserProfile() {
    }

    public UserProfile(String name, Integer dailyCalorieTarget, BigDecimal currentWeight,
                       BigDecimal targetWeight) {
        this(name, null, dailyCalorieTarget, currentWeight, targetWeight);
    }

    public UserProfile(String name, String email, Integer dailyCalorieTarget, BigDecimal currentWeight,
                       BigDecimal targetWeight) {
        this.name = name;
        this.email = email;
        this.dailyCalorieTarget = dailyCalorieTarget;
        this.currentWeight = currentWeight;
        this.targetWeight = targetWeight;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Integer getDailyCalorieTarget() {
        return dailyCalorieTarget;
    }

    public void setDailyCalorieTarget(Integer dailyCalorieTarget) {
        this.dailyCalorieTarget = dailyCalorieTarget;
    }

    public BigDecimal getCurrentWeight() {
        return currentWeight;
    }

    public void setCurrentWeight(BigDecimal currentWeight) {
        this.currentWeight = currentWeight;
    }

    public BigDecimal getTargetWeight() {
        return targetWeight;
    }

    public void setTargetWeight(BigDecimal targetWeight) {
        this.targetWeight = targetWeight;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void updateProfile(String name, Integer dailyCalorieTarget, BigDecimal currentWeight, BigDecimal targetWeight) {
        this.name = name;
        this.dailyCalorieTarget = dailyCalorieTarget;
        this.currentWeight = currentWeight;
        this.targetWeight = targetWeight;
    }
}
