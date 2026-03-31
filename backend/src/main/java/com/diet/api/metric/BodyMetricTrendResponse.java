package com.diet.api.metric;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "身体指标趋势响应")
public record BodyMetricTrendResponse(
        @Schema(description = "指标标识")
        BodyMetricTrendMetricKey metricKey,

        @Schema(description = "时间区间类型")
        MetricTrendRangeType rangeType,

        @Schema(description = "单位")
        String unit,

        @Schema(description = "趋势点列表")
        List<BodyMetricTrendPointResponse> points,

        @Schema(description = "是否还有更多历史数据")
        boolean hasMore,

        @Schema(description = "下一页游标测量时间")
        LocalDateTime nextCursorMeasuredAt,

        @Schema(description = "下一页游标记录 ID")
        Long nextCursorId
) {
}
