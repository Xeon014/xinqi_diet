package com.diet.api.metric;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Schema(description = "身体指标快照项")
public record BodyMetricSnapshotItemResponse(
        @Schema(description = "指标标识")
        BodyMetricTrendMetricKey metricKey,

        @Schema(description = "最近一次记录值")
        BigDecimal latestValue,

        @Schema(description = "单位")
        String unit,

        @Schema(description = "最近一次记录日期")
        LocalDate latestRecordDate,

        @Schema(description = "最近一次记录时间")
        LocalDateTime latestMeasuredAt
) {
}
