package com.diet.domain.metric;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BodyMetricRecordRepository {

    void save(BodyMetricRecord bodyMetricRecord);

    Optional<BodyMetricRecord> findLatestByMetricType(Long userId, BodyMetricType metricType);

    List<BodyMetricRecord> findDailyLatestByDate(Long userId, LocalDate date);

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

    List<BodyMetricRecord> findByMetricTypeWithCursor(
            Long userId,
            BodyMetricType metricType,
            LocalDate cursorDate,
            Long cursorId,
            int limit
    );

    Optional<BodyMetricRecord> findByIdAndUserId(Long id, Long userId);

    void deleteById(Long id);
}
