package com.diet.domain.user;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
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

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;

    private Gender gender;

    private Integer age;

    private BigDecimal height;

    @TableField("activity_level")
    private ActivityLevel activityLevel;

    @TableField("daily_calorie_target")
    private Integer dailyCalorieTarget;

    @TableField("current_weight")
    private BigDecimal currentWeight;

    @TableField("target_weight")
    private BigDecimal targetWeight;

    @TableField("created_at")
    private LocalDateTime createdAt;

    public UserProfile(
            String name,
            Gender gender,
            Integer age,
            BigDecimal height,
            ActivityLevel activityLevel,
            Integer dailyCalorieTarget,
            BigDecimal currentWeight,
            BigDecimal targetWeight
    ) {
        this.name = name;
        this.gender = gender;
        this.age = age;
        this.height = height;
        this.activityLevel = activityLevel;
        this.dailyCalorieTarget = dailyCalorieTarget;
        this.currentWeight = currentWeight;
        this.targetWeight = targetWeight;
        this.createdAt = LocalDateTime.now();
    }

    public void updateProfile(
            String name,
            Gender gender,
            Integer age,
            BigDecimal height,
            ActivityLevel activityLevel,
            Integer dailyCalorieTarget,
            BigDecimal currentWeight,
            BigDecimal targetWeight
    ) {
        this.name = name;
        this.gender = gender;
        this.age = age;
        this.height = height;
        this.activityLevel = activityLevel;
        this.dailyCalorieTarget = dailyCalorieTarget;
        this.currentWeight = currentWeight;
        this.targetWeight = targetWeight;
    }

    public BigDecimal calculateBmr() {
        BigDecimal base = currentWeight.multiply(TEN)
                .add(height.multiply(SIX_POINT_TWENTY_FIVE))
                .subtract(BigDecimal.valueOf(age).multiply(FIVE));
        BigDecimal offset = gender == Gender.MALE ? MALE_OFFSET : FEMALE_OFFSET;
        return base.add(offset).setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal calculateTdee() {
        return calculateBmr().multiply(activityLevel.getMultiplier()).setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal weightToLose() {
        return currentWeight.subtract(targetWeight).max(BigDecimal.ZERO);
    }
}
