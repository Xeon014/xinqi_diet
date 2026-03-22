package com.diet.dto.metric;

import com.diet.domain.metric.BodyMetricUnit;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Schema(description = "身体指标历史明细")
public record BodyMetricHistoryRecordResponse(
        @Schema(description = "记录 ID")
        Long id,

        @Schema(description = "记录日期")
        LocalDate recordDate,

        @Schema(description = "创建时间")
        LocalDateTime createdAt,

        @Schema(description = "指标值")
        BigDecimal metricValue,

        @Schema(description = "单位")
        BodyMetricUnit unit
) {
}
