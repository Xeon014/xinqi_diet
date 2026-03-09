package com.diet.domain.combo;

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
@TableName("meal_combo_item")
public class MealComboItem {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("combo_id")
    private Long comboId;

    @TableField("food_id")
    private Long foodId;

    @TableField("quantity_in_gram")
    private BigDecimal quantityInGram;

    @TableField("sort_order")
    private Integer sortOrder;

    @TableField("created_at")
    private LocalDateTime createdAt;

    public MealComboItem(Long comboId, Long foodId, BigDecimal quantityInGram, Integer sortOrder) {
        this.comboId = comboId;
        this.foodId = foodId;
        this.quantityInGram = quantityInGram;
        this.sortOrder = sortOrder;
        this.createdAt = LocalDateTime.now();
    }
}
