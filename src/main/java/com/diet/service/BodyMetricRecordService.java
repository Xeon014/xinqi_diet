package com.diet.service;

import com.diet.common.NotFoundException;
import com.diet.domain.metric.BodyMetricRecord;
import com.diet.domain.metric.BodyMetricRecordRepository;
import com.diet.domain.metric.BodyMetricType;
import com.diet.domain.metric.BodyMetricUnit;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.metric.BodyMetricRecordResponse;
import com.diet.dto.metric.BodyMetricSnapshotItemResponse;
import com.diet.dto.metric.BodyMetricSnapshotResponse;
import com.diet.dto.metric.BodyMetricTrendMetricKey;
import com.diet.dto.metric.BodyMetricTrendPointResponse;
import com.diet.dto.metric.BodyMetricTrendResponse;
import com.diet.dto.metric.CreateBodyMetricRecordRequest;
import com.diet.dto.metric.MetricTrendRangeType;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class BodyMetricRecordService {

    private static final int DEFAULT_ALL_PAGE_SIZE = 120;

    private static final int MAX_ALL_PAGE_SIZE = 240;

    private static final List<BodyMetricTrendMetricKey> SNAPSHOT_METRIC_ORDER = List.of(
            BodyMetricTrendMetricKey.WEIGHT,
            BodyMetricTrendMetricKey.BMI,
            BodyMetricTrendMetricKey.CHEST_CIRCUMFERENCE,
            BodyMetricTrendMetricKey.WAIST_CIRCUMFERENCE,
            BodyMetricTrendMetricKey.HIP_CIRCUMFERENCE,
            BodyMetricTrendMetricKey.THIGH_CIRCUMFERENCE
    );

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

    @Transactional(readOnly = true)
    public BodyMetricSnapshotResponse getSnapshot(Long userId) {
        UserProfile user = getUser(userId);
        List<BodyMetricSnapshotItemResponse> items = SNAPSHOT_METRIC_ORDER.stream()
                .map(metricKey -> buildSnapshotItem(user, metricKey))
                .toList();
        return new BodyMetricSnapshotResponse(items);
    }

    @Transactional(readOnly = true)
    public BodyMetricTrendResponse getTrend(
            Long userId,
            BodyMetricTrendMetricKey metricKey,
            MetricTrendRangeType rangeType,
            LocalDate cursorDate,
            Long cursorId,
            Integer pageSize
    ) {
        UserProfile user = getUser(userId);
        if (metricKey == BodyMetricTrendMetricKey.BMI && !hasValidHeight(user.getHeight())) {
            return new BodyMetricTrendResponse(
                    metricKey,
                    rangeType,
                    metricKey.unitLabel(),
                    List.of(),
                    false,
                    null,
                    null
            );
        }
        BodyMetricType sourceMetricType = resolveSourceMetricType(metricKey);
        if (rangeType == MetricTrendRangeType.ALL) {
            if ((cursorDate == null) != (cursorId == null)) {
                throw new IllegalArgumentException("cursorDate and cursorId must be provided together");
            }
            int resolvedPageSize = resolvePageSize(pageSize);
            List<BodyMetricRecord> queryResult = bodyMetricRecordRepository.findDailyLatestByMetricTypeWithCursor(
                    user.getId(),
                    sourceMetricType,
                    cursorDate,
                    cursorId,
                    resolvedPageSize + 1
            );
            boolean hasMore = queryResult.size() > resolvedPageSize;
            List<BodyMetricRecord> pageRecords = hasMore
                    ? queryResult.subList(0, resolvedPageSize)
                    : queryResult;

            LocalDate nextCursorDate = null;
            Long nextCursorId = null;
            if (hasMore && !pageRecords.isEmpty()) {
                BodyMetricRecord oldestInPage = pageRecords.get(pageRecords.size() - 1);
                nextCursorDate = oldestInPage.getRecordDate();
                nextCursorId = oldestInPage.getId();
            }

            List<BodyMetricRecord> sortedAscRecords = new ArrayList<>(pageRecords);
            sortedAscRecords.sort(Comparator
                    .comparing(BodyMetricRecord::getRecordDate)
                    .thenComparing(BodyMetricRecord::getId));

            return new BodyMetricTrendResponse(
                    metricKey,
                    rangeType,
                    metricKey.unitLabel(),
                    toTrendPoints(metricKey, user, sortedAscRecords),
                    hasMore,
                    nextCursorDate,
                    nextCursorId
            );
        }

        LocalDate endDate = LocalDate.now();
        LocalDate startDate = rangeType == MetricTrendRangeType.MONTH
                ? endDate.minusDays(29)
                : endDate.minusDays(364);
        List<BodyMetricRecord> records = bodyMetricRecordRepository.findDailyLatestByMetricTypeAndDateRange(
                user.getId(),
                sourceMetricType,
                startDate,
                endDate
        );
        return new BodyMetricTrendResponse(
                metricKey,
                rangeType,
                metricKey.unitLabel(),
                toTrendPoints(metricKey, user, records),
                false,
                null,
                null
        );
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

    private BodyMetricSnapshotItemResponse buildSnapshotItem(UserProfile user, BodyMetricTrendMetricKey metricKey) {
        if (metricKey == BodyMetricTrendMetricKey.BMI) {
            return buildBmiSnapshotItem(user);
        }
        BodyMetricRecord latestRecord = bodyMetricRecordRepository.findLatestByMetricType(user.getId(), metricKey.metricType())
                .orElse(null);
        return new BodyMetricSnapshotItemResponse(
                metricKey,
                latestRecord == null ? null : latestRecord.getMetricValue(),
                metricKey.unitLabel(),
                latestRecord == null ? null : latestRecord.getRecordDate()
        );
    }

    private BodyMetricSnapshotItemResponse buildBmiSnapshotItem(UserProfile user) {
        BodyMetricRecord latestWeightRecord = bodyMetricRecordRepository.findLatestByMetricType(
                user.getId(),
                BodyMetricType.WEIGHT
        ).orElse(null);
        if (latestWeightRecord == null) {
            return new BodyMetricSnapshotItemResponse(BodyMetricTrendMetricKey.BMI, null, BodyMetricTrendMetricKey.BMI.unitLabel(), null);
        }
        BigDecimal bmi = calculateBmi(latestWeightRecord.getMetricValue(), user.getHeight());
        return new BodyMetricSnapshotItemResponse(
                BodyMetricTrendMetricKey.BMI,
                bmi,
                BodyMetricTrendMetricKey.BMI.unitLabel(),
                bmi == null ? null : latestWeightRecord.getRecordDate()
        );
    }

    private List<BodyMetricTrendPointResponse> toTrendPoints(
            BodyMetricTrendMetricKey metricKey,
            UserProfile user,
            List<BodyMetricRecord> records
    ) {
        if (metricKey == BodyMetricTrendMetricKey.BMI) {
            return records.stream()
                    .map(record -> {
                        BigDecimal bmi = calculateBmi(record.getMetricValue(), user.getHeight());
                        if (bmi == null) {
                            return null;
                        }
                        return new BodyMetricTrendPointResponse(record.getRecordDate(), bmi);
                    })
                    .filter(java.util.Objects::nonNull)
                    .toList();
        }

        return records.stream()
                .map(record -> new BodyMetricTrendPointResponse(record.getRecordDate(), record.getMetricValue()))
                .toList();
    }

    private BodyMetricType resolveSourceMetricType(BodyMetricTrendMetricKey metricKey) {
        return metricKey == BodyMetricTrendMetricKey.BMI ? BodyMetricType.WEIGHT : metricKey.metricType();
    }

    private int resolvePageSize(Integer pageSize) {
        if (pageSize == null) {
            return DEFAULT_ALL_PAGE_SIZE;
        }
        if (pageSize < 1 || pageSize > MAX_ALL_PAGE_SIZE) {
            throw new IllegalArgumentException("pageSize must be between 1 and 240");
        }
        return pageSize;
    }

    private BigDecimal calculateBmi(BigDecimal weightKg, BigDecimal heightCm) {
        if (weightKg == null || !hasValidHeight(heightCm)) {
            return null;
        }
        BigDecimal heightInMeter = heightCm.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        if (heightInMeter.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        return weightKg.divide(heightInMeter.multiply(heightInMeter), 2, RoundingMode.HALF_UP);
    }

    private boolean hasValidHeight(BigDecimal heightCm) {
        return heightCm != null && heightCm.compareTo(BigDecimal.ZERO) > 0;
    }

    private void validateUnit(BodyMetricType metricType, BodyMetricUnit unit) {
        if (metricType == BodyMetricType.WEIGHT) {
            if (unit != BodyMetricUnit.KG) {
                throw new IllegalArgumentException("weight metric must use KG");
            }
            return;
        }
        if (unit != BodyMetricUnit.CM) {
            throw new IllegalArgumentException("circumference metric must use CM");
        }
    }

    private UserProfile getUser(Long id) {
        return userProfileRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("user not found, id=" + id));
    }
}
