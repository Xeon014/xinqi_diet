package com.diet.api.metric;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "身体指标历史列表响应")
public record BodyMetricHistoryResponse(
        @Schema(description = "指标标识")
        BodyMetricTrendMetricKey metricKey,

        @Schema(description = "单位")
        String unit,

        @Schema(description = "历史记录")
        List<BodyMetricHistoryRecordResponse> records,

        @Schema(description = "是否还有更多历史数据")
        boolean hasMore,

        @Schema(description = "下一页游标测量时间")
        LocalDateTime nextCursorMeasuredAt,

        @Schema(description = "下一页游标记录 ID")
        Long nextCursorId
) {
}
