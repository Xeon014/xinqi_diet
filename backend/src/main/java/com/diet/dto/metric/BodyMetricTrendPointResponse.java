package com.diet.dto.metric;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;

@Schema(description = "身体指标趋势点")
public record BodyMetricTrendPointResponse(
        @Schema(description = "记录日期")
        LocalDate date,

        @Schema(description = "指标值")
        BigDecimal value
) {
}
