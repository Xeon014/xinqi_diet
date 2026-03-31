package com.diet.api.metric;

import com.diet.domain.metric.BodyMetricType;
import com.diet.domain.metric.BodyMetricUnit;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Schema(description = "身体指标记录")
public record BodyMetricRecordResponse(
        @Schema(description = "记录 ID")
        Long id,

        @Schema(description = "用户 ID")
        Long userId,

        @Schema(description = "指标类型")
        BodyMetricType metricType,

        @Schema(description = "指标数值")
        BigDecimal metricValue,

        @Schema(description = "单位")
        BodyMetricUnit unit,

        @Schema(description = "记录日期")
        LocalDate recordDate,

        @Schema(description = "业务测量时间")
        LocalDateTime measuredAt,

        @Schema(description = "创建时间")
        LocalDateTime createdAt
) {
}
