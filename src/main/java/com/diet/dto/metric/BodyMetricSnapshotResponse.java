package com.diet.dto.metric;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "身体指标快照响应")
public record BodyMetricSnapshotResponse(
        @Schema(description = "指标快照列表")
        List<BodyMetricSnapshotItemResponse> items
) {
}
