package com.diet.repository;

import com.diet.domain.metric.BodyMetricRecord;
import com.diet.domain.metric.BodyMetricRecordRepository;
import com.diet.domain.metric.BodyMetricType;
import com.diet.mapper.BodyMetricRecordMapper;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class BodyMetricRecordRepositoryImpl implements BodyMetricRecordRepository {

    private final BodyMetricRecordMapper bodyMetricRecordMapper;

    public BodyMetricRecordRepositoryImpl(BodyMetricRecordMapper bodyMetricRecordMapper) {
        this.bodyMetricRecordMapper = bodyMetricRecordMapper;
    }

    @Override
    public void save(BodyMetricRecord bodyMetricRecord) {
        if (bodyMetricRecord.getId() == null) {
            bodyMetricRecordMapper.insert(bodyMetricRecord);
            return;
        }
        bodyMetricRecordMapper.updateById(bodyMetricRecord);
    }

    @Override
    public Optional<BodyMetricRecord> findLatestByMetricType(Long userId, BodyMetricType metricType) {
        return Optional.ofNullable(bodyMetricRecordMapper.findLatestByMetricType(userId, metricType));
    }

    @Override
    public List<BodyMetricRecord> findDailyLatestByMetricTypeAndDateRange(
            Long userId,
            BodyMetricType metricType,
            LocalDate startDate,
            LocalDate endDate
    ) {
        return bodyMetricRecordMapper.findDailyLatestByMetricTypeAndDateRange(userId, metricType, startDate, endDate);
    }

    @Override
    public List<BodyMetricRecord> findDailyLatestByMetricTypeWithCursor(
            Long userId,
            BodyMetricType metricType,
            LocalDate cursorDate,
            Long cursorId,
            int limit
    ) {
        return bodyMetricRecordMapper.findDailyLatestByMetricTypeWithCursor(userId, metricType, cursorDate, cursorId, limit);
    }
}
