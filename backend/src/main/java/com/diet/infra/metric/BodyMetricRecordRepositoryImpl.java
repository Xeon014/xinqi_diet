package com.diet.infra.metric;

import com.diet.domain.metric.BodyMetricRecord;
import com.diet.domain.metric.BodyMetricRecordRepository;
import com.diet.domain.metric.BodyMetricType;
import com.diet.infra.metric.BodyMetricRecordMapper;
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
    public List<BodyMetricRecord> findDailyLatestByDate(Long userId, LocalDate date) {
        return bodyMetricRecordMapper.findDailyLatestByDate(userId, date);
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

    @Override
    public List<BodyMetricRecord> findByMetricTypeWithCursor(
            Long userId,
            BodyMetricType metricType,
            LocalDate cursorDate,
            Long cursorId,
            int limit
    ) {
        return bodyMetricRecordMapper.findByMetricTypeWithCursor(userId, metricType, cursorDate, cursorId, limit);
    }

    @Override
    public Optional<BodyMetricRecord> findByIdAndUserId(Long id, Long userId) {
        return Optional.ofNullable(bodyMetricRecordMapper.findByIdAndUserId(id, userId));
    }

    @Override
    public void deleteById(Long id) {
        bodyMetricRecordMapper.deleteById(id);
    }

    @Override
    public void batchInsert(List<BodyMetricRecord> records) {
        if (records == null || records.isEmpty()) {
            return;
        }
        int batchSize = 500;
        for (int i = 0; i < records.size(); i += batchSize) {
            List<BodyMetricRecord> batch = records.subList(i, Math.min(i + batchSize, records.size()));
            bodyMetricRecordMapper.batchInsert(batch);
        }
    }

    @Override
    public List<BodyMetricRecord> findByUserIdAndMetricTypeAndRecordDateIn(
            Long userId,
            BodyMetricType metricType,
            List<LocalDate> dates
    ) {
        if (dates == null || dates.isEmpty()) {
            return List.of();
        }
        return bodyMetricRecordMapper.findByUserIdAndMetricTypeAndRecordDateIn(userId, metricType, dates);
    }
}
