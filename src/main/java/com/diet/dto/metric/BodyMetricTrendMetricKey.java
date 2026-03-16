package com.diet.dto.metric;

import com.diet.domain.metric.BodyMetricType;
import com.diet.domain.metric.BodyMetricUnit;

public enum BodyMetricTrendMetricKey {
    WEIGHT(BodyMetricType.WEIGHT, BodyMetricUnit.KG, "kg"),
    BMI(null, null, "BMI"),
    CHEST_CIRCUMFERENCE(BodyMetricType.CHEST_CIRCUMFERENCE, BodyMetricUnit.CM, "cm"),
    WAIST_CIRCUMFERENCE(BodyMetricType.WAIST_CIRCUMFERENCE, BodyMetricUnit.CM, "cm"),
    HIP_CIRCUMFERENCE(BodyMetricType.HIP_CIRCUMFERENCE, BodyMetricUnit.CM, "cm"),
    THIGH_CIRCUMFERENCE(BodyMetricType.THIGH_CIRCUMFERENCE, BodyMetricUnit.CM, "cm");

    private final BodyMetricType metricType;

    private final BodyMetricUnit unit;

    private final String unitLabel;

    BodyMetricTrendMetricKey(BodyMetricType metricType, BodyMetricUnit unit, String unitLabel) {
        this.metricType = metricType;
        this.unit = unit;
        this.unitLabel = unitLabel;
    }

    public BodyMetricType metricType() {
        return metricType;
    }

    public BodyMetricUnit unit() {
        return unit;
    }

    public String unitLabel() {
        return unitLabel;
    }
}
