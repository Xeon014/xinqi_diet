package com.diet.domain.exercise;

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
@TableName("exercise")
public class Exercise {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;

    @TableField("met_value")
    private BigDecimal metValue;

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

    public Exercise(String name, BigDecimal metValue, String category) {
        this.name = name;
        this.metValue = metValue;
        this.category = category;
        this.source = "MANUAL";
        this.builtin = false;
        this.sortOrder = 9999;
        this.createdAt = LocalDateTime.now();
    }
}