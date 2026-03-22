package com.diet.domain.exercise;

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
@TableName("exercise_record")
public class ExerciseRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("user_id")
    private Long userId;

    @TableField("exercise_id")
    private Long exerciseId;

    @TableField("duration_minutes")
    private Integer durationMinutes;

    @TableField("intensity_level")
    private ExerciseIntensity intensityLevel;

    @TableField("intensity_factor")
    private BigDecimal intensityFactor;

    @TableField("weight_kg_snapshot")
    private BigDecimal weightKgSnapshot;

    @TableField("total_calories")
    private BigDecimal totalCalories;

    @TableField("record_date")
    private LocalDate recordDate;

    @TableField("created_at")
    private LocalDateTime createdAt;

    public ExerciseRecord(
            Long userId,
            Long exerciseId,
            Integer durationMinutes,
            ExerciseIntensity intensityLevel,
            BigDecimal intensityFactor,
            BigDecimal weightKgSnapshot,
            BigDecimal totalCalories,
            LocalDate recordDate
    ) {
        this.userId = userId;
        this.exerciseId = exerciseId;
        this.durationMinutes = durationMinutes;
        this.intensityLevel = intensityLevel;
        this.intensityFactor = intensityFactor;
        this.weightKgSnapshot = weightKgSnapshot;
        this.totalCalories = totalCalories;
        this.recordDate = recordDate;
        this.createdAt = LocalDateTime.now();
    }

    public static BigDecimal calculateTotalCalories(
            BigDecimal metValue,
            BigDecimal weightKgSnapshot,
            Integer durationMinutes,
            BigDecimal intensityFactor
    ) {
        return metValue
                .multiply(weightKgSnapshot)
                .multiply(BigDecimal.valueOf(durationMinutes))
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP)
                .multiply(intensityFactor)
                .setScale(2, RoundingMode.HALF_UP);
    }
}