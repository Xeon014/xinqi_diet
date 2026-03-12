package com.diet.repository;

import com.diet.domain.metric.BodyMetricRecord;
import com.diet.domain.metric.BodyMetricRecordRepository;
import com.diet.mapper.BodyMetricRecordMapper;
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
}
