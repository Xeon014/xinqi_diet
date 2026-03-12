package com.diet.domain.metric;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@TableName("body_metric_record")
public class BodyMetricRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("user_id")
    private Long userId;

    @TableField("metric_type")
    private BodyMetricType metricType;

    @TableField("metric_value")
    private BigDecimal metricValue;

    private BodyMetricUnit unit;

    @TableField("record_date")
    private LocalDate recordDate;

    @TableField("created_at")
    private LocalDateTime createdAt;

    @TableField("updated_at")
    private LocalDateTime updatedAt;

    public BodyMetricRecord(
            Long userId,
            BodyMetricType metricType,
            BigDecimal metricValue,
            BodyMetricUnit unit,
            LocalDate recordDate
    ) {
        LocalDateTime now = LocalDateTime.now();
        this.userId = userId;
        this.metricType = metricType;
        this.metricValue = metricValue;
        this.unit = unit;
        this.recordDate = recordDate;
        this.createdAt = now;
        this.updatedAt = now;
    }
}
