package com.diet.service;

import com.diet.common.NotFoundException;
import com.diet.domain.metric.BodyMetricRecord;
import com.diet.domain.metric.BodyMetricRecordRepository;
import com.diet.domain.metric.BodyMetricType;
import com.diet.domain.metric.BodyMetricUnit;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.metric.BodyMetricRecordResponse;
import com.diet.dto.metric.CreateBodyMetricRecordRequest;
import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class BodyMetricRecordService {

    private final BodyMetricRecordRepository bodyMetricRecordRepository;

    private final UserProfileRepository userProfileRepository;

    public BodyMetricRecordService(
            BodyMetricRecordRepository bodyMetricRecordRepository,
            UserProfileRepository userProfileRepository
    ) {
        this.bodyMetricRecordRepository = bodyMetricRecordRepository;
        this.userProfileRepository = userProfileRepository;
    }

    public BodyMetricRecordResponse create(Long userId, CreateBodyMetricRecordRequest request) {
        UserProfile user = getUser(userId);
        validateUnit(request.metricType(), request.unit());

        BodyMetricRecord record = new BodyMetricRecord(
                user.getId(),
                request.metricType(),
                request.metricValue(),
                request.unit(),
                request.recordDate()
        );
        bodyMetricRecordRepository.save(record);

        if (request.metricType() == BodyMetricType.WEIGHT && request.recordDate().equals(LocalDate.now())) {
            user.setCurrentWeight(request.metricValue());
            userProfileRepository.update(user);
        }

        return toResponse(record);
    }

    private BodyMetricRecordResponse toResponse(BodyMetricRecord record) {
        return new BodyMetricRecordResponse(
                record.getId(),
                record.getUserId(),
                record.getMetricType(),
                record.getMetricValue(),
                record.getUnit(),
                record.getRecordDate(),
                record.getCreatedAt()
        );
    }

    private void validateUnit(BodyMetricType metricType, BodyMetricUnit unit) {
        if (metricType == BodyMetricType.WEIGHT && unit != BodyMetricUnit.KG) {
            throw new IllegalArgumentException("weight metric must use KG");
        }
    }

    private UserProfile getUser(Long id) {
        return userProfileRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("user not found, id=" + id));
    }
}
