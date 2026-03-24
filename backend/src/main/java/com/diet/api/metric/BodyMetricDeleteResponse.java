package com.diet.api.metric;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "身体指标删除响应")
public record BodyMetricDeleteResponse(
        @Schema(description = "是否删除成功")
        boolean deleted
) {
}
