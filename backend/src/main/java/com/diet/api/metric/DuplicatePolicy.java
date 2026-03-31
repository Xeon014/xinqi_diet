package com.diet.api.metric;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "重复记录处理策略")
public enum DuplicatePolicy {
    @Schema(description = "跳过已有记录") SKIP,
    @Schema(description = "覆盖已有记录") OVERWRITE
}
