package com.diet.dto.metric;

import com.diet.domain.metric.BodyMetricType;
import com.diet.domain.metric.BodyMetricUnit;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

@Schema(description = "新增身体指标记录请求")
public record CreateBodyMetricRecordRequest(
        @NotNull(message = "metricType must not be null")
        @Schema(description = "指标类型", example = "WEIGHT")
        BodyMetricType metricType,

        @NotNull(message = "metricValue must not be null")
        @DecimalMin(value = "0.1", message = "metricValue must be greater than 0")
        @Schema(description = "指标数值")
        BigDecimal metricValue,

        @NotNull(message = "unit must not be null")
        @Schema(description = "单位", example = "KG")
        BodyMetricUnit unit,

        @NotNull(message = "recordDate must not be null")
        @Schema(description = "记录日期", example = "2026-03-12")
        LocalDate recordDate
) {
}
