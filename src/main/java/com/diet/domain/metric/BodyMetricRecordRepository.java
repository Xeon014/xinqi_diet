package com.diet.domain.metric;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BodyMetricRecordRepository {

    void save(BodyMetricRecord bodyMetricRecord);

    Optional<BodyMetricRecord> findLatestByMetricType(Long userId, BodyMetricType metricType);

    List<BodyMetricRecord> findDailyLatestByMetricTypeAndDateRange(
            Long userId,
            BodyMetricType metricType,
            LocalDate startDate,
            LocalDate endDate
    );

    List<BodyMetricRecord> findDailyLatestByMetricTypeWithCursor(
            Long userId,
            BodyMetricType metricType,
            LocalDate cursorDate,
            Long cursorId,
            int limit
    );
}
