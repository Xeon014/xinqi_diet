package com.diet.domain.user;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@TableName("user_profile")
public class UserProfile {

    private static final BigDecimal TEN = new BigDecimal("10");

    private static final BigDecimal SIX_POINT_TWENTY_FIVE = new BigDecimal("6.25");

    private static final BigDecimal FIVE = new BigDecimal("5");

    private static final BigDecimal MALE_OFFSET = new BigDecimal("5");

    private static final BigDecimal FEMALE_OFFSET = new BigDecimal("-161");

    private static final BigDecimal DAILY_CONSUMPTION_BASE_RATIO = new BigDecimal("0.70");

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("open_id")
    private String openId;

    @TableField("union_id")
    private String unionId;

    private String name;

    private String nickname;

    @TableField("avatar_url")
    private String avatarUrl;

    private Gender gender;

    @TableField("birth_date")
    private LocalDate birthDate;

    private BigDecimal height;

    @TableField("activity_level")
    private ActivityLevel activityLevel;

    @TableField("daily_calorie_target")
    private Integer dailyCalorieTarget;

    @TableField("current_weight")
    private BigDecimal currentWeight;

    @TableField("target_weight")
    private BigDecimal targetWeight;

    @TableField("custom_bmr")
    private Integer customBmr;

    @TableField("custom_tdee")
    private Integer customTdee;

    @TableField("last_login_at")
    private LocalDateTime lastLoginAt;

    @TableField("created_at")
    private LocalDateTime createdAt;

    public UserProfile(
            String name,
            Gender gender,
            LocalDate birthDate,
            BigDecimal height,
            ActivityLevel activityLevel,
            Integer dailyCalorieTarget,
            BigDecimal currentWeight,
            BigDecimal targetWeight,
            Integer customBmr,
            Integer customTdee
    ) {
        this.name = name;
        this.gender = gender;
        this.birthDate = birthDate;
        this.height = height;
        this.activityLevel = activityLevel;
        this.dailyCalorieTarget = dailyCalorieTarget;
        this.currentWeight = currentWeight;
        this.targetWeight = targetWeight;
        this.customBmr = customBmr;
        this.customTdee = customTdee;
        this.createdAt = LocalDateTime.now();
    }

    public void updateProfile(
            String name,
            Gender gender,
            LocalDate birthDate,
            BigDecimal height,
            ActivityLevel activityLevel,
            Integer dailyCalorieTarget,
            BigDecimal currentWeight,
            BigDecimal targetWeight,
            Integer customBmr,
            Integer customTdee
    ) {
        this.name = name;
        this.gender = gender;
        this.birthDate = birthDate;
        this.height = height;
        this.activityLevel = activityLevel;
        this.dailyCalorieTarget = dailyCalorieTarget;
        this.currentWeight = currentWeight;
        this.targetWeight = targetWeight;
        this.customBmr = customBmr;
        this.customTdee = customTdee;
    }

    public Integer calculateAge() {
        if (birthDate == null) {
            return null;
        }
        return Period.between(birthDate, LocalDate.now()).getYears();
    }

    public BigDecimal calculateBmi() {
        if (height == null || currentWeight == null || height.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        BigDecimal heightInMeter = height.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        if (heightInMeter.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        return currentWeight.divide(heightInMeter.multiply(heightInMeter), 2, RoundingMode.HALF_UP);
    }

    public BigDecimal calculateFormulaBmr() {
        Integer age = calculateAge();
        if (gender == null || currentWeight == null || height == null || age == null) {
            return null;
        }
        BigDecimal base = currentWeight.multiply(TEN)
                .add(height.multiply(SIX_POINT_TWENTY_FIVE))
                .subtract(BigDecimal.valueOf(age).multiply(FIVE));
        BigDecimal offset = gender == Gender.MALE ? MALE_OFFSET : FEMALE_OFFSET;
        return base.add(offset).setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal calculateBmr() {
        if (customBmr != null && customBmr > 0) {
            return BigDecimal.valueOf(customBmr).setScale(2, RoundingMode.HALF_UP);
        }
        return calculateFormulaBmr();
    }

    public BigDecimal calculateEstimatedTdee() {
        BigDecimal bmr = calculateBmr();
        if (bmr == null) {
            return null;
        }
        return bmr.divide(DAILY_CONSUMPTION_BASE_RATIO, 2, RoundingMode.HALF_UP);
    }

    public BigDecimal calculateTdee() {
        if (customTdee != null && customTdee > 0) {
            return BigDecimal.valueOf(customTdee).setScale(2, RoundingMode.HALF_UP);
        }
        return calculateEstimatedTdee();
    }

    public Integer calculateTargetCalories() {
        BigDecimal tdee = calculateTdee();
        if (tdee == null) {
            return null;
        }
        return tdee.setScale(0, RoundingMode.HALF_UP).intValue();
    }

    public BigDecimal weightToLose() {
        if (currentWeight == null || targetWeight == null) {
            return null;
        }
        return currentWeight.subtract(targetWeight).max(BigDecimal.ZERO);
    }
}
