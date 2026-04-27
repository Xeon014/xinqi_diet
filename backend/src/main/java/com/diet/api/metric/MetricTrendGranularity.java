package com.diet.api.metric;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "趋势点粒度")
public enum MetricTrendGranularity {
    DAY,
    MONTH,
    AUTO
}
