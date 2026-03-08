package com.diet.domain.food;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@TableName("food")
public class Food {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;

    @TableField("calories_per_100g")
    private BigDecimal caloriesPer100g;

    @TableField("protein_per_100g")
    private BigDecimal proteinPer100g;

    @TableField("carbs_per_100g")
    private BigDecimal carbsPer100g;

    @TableField("fat_per_100g")
    private BigDecimal fatPer100g;

    private String category;

    private String source;

    @TableField("source_ref")
    private String sourceRef;

    private String aliases;

    @TableField("is_builtin")
    private Boolean builtin;

    @TableField("sort_order")
    private Integer sortOrder;

    @TableField("created_at")
    private LocalDateTime createdAt;

    public Food(
            String name,
            BigDecimal caloriesPer100g,
            BigDecimal proteinPer100g,
            BigDecimal carbsPer100g,
            BigDecimal fatPer100g,
            String category
    ) {
        this.name = name;
        this.caloriesPer100g = caloriesPer100g;
        this.proteinPer100g = proteinPer100g;
        this.carbsPer100g = carbsPer100g;
        this.fatPer100g = fatPer100g;
        this.category = category;
        this.source = "MANUAL";
        this.builtin = false;
        this.sortOrder = 9999;
        this.createdAt = LocalDateTime.now();
    }

    public Food(
            String name,
            BigDecimal caloriesPer100g,
            BigDecimal proteinPer100g,
            BigDecimal carbsPer100g,
            BigDecimal fatPer100g,
            String category,
            String source,
            String sourceRef,
            String aliases,
            Boolean builtin
    ) {
        this(name, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g, category);
        this.source = source;
        this.sourceRef = sourceRef;
        this.aliases = aliases;
        this.builtin = builtin;
    }
}
