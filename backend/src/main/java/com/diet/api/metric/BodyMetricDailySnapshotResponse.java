package com.diet.api.metric;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.util.List;

@Schema(description = "按日身体指标快照响应")
public record BodyMetricDailySnapshotResponse(
        @Schema(description = "查询日期")
        LocalDate date,

        @Schema(description = "指标快照列表")
        List<BodyMetricSnapshotItemResponse> items
) {
}
