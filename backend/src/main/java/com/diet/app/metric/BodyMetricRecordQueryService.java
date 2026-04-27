package com.diet.app.metric;

import com.diet.types.common.NotFoundException;
import com.diet.domain.metric.BodyMetricRecord;
import com.diet.domain.metric.BodyMetricRecordRepository;
import com.diet.domain.metric.BodyMetricType;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.api.metric.BodyMetricDailySnapshotResponse;
import com.diet.api.metric.BodyMetricHistoryRecordResponse;
import com.diet.api.metric.BodyMetricHistoryResponse;
import com.diet.api.metric.BodyMetricSnapshotItemResponse;
import com.diet.api.metric.BodyMetricSnapshotResponse;
import com.diet.api.metric.BodyMetricTrendMetricKey;
import com.diet.api.metric.BodyMetricTrendPointResponse;
import com.diet.api.metric.BodyMetricTrendResponse;
import com.diet.api.metric.MetricTrendGranularity;
import com.diet.api.metric.MetricTrendRangeType;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class BodyMetricRecordQueryService {

    private static final int DEFAULT_ALL_PAGE_SIZE = 120;

    private static final int MAX_ALL_PAGE_SIZE = 240;

    private static final int MAX_AGGREGATION_RECORDS = 5000;

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

    public BodyMetricRecordQueryService(
            BodyMetricRecordRepository bodyMetricRecordRepository,
            UserProfileRepository userProfileRepository
    ) {
        this.bodyMetricRecordRepository = bodyMetricRecordRepository;
        this.userProfileRepository = userProfileRepository;
    }

    public BodyMetricSnapshotResponse getSnapshot(Long userId) {
        UserProfile user = getUser(userId);
        List<BodyMetricSnapshotItemResponse> items = SNAPSHOT_METRIC_ORDER.stream()
                .map(metricKey -> buildSnapshotItem(user, metricKey))
                .toList();
        return new BodyMetricSnapshotResponse(items);
    }

    public BodyMetricDailySnapshotResponse getDailySnapshot(Long userId, LocalDate date) {
        UserProfile user = getUser(userId);
        Map<BodyMetricType, BodyMetricRecord> dailyLatestMap = new EnumMap<>(BodyMetricType.class);
        bodyMetricRecordRepository.findDailyLatestByDate(userId, date)
                .forEach(record -> dailyLatestMap.put(record.getMetricType(), record));

        List<BodyMetricSnapshotItemResponse> items = SNAPSHOT_METRIC_ORDER.stream()
                .map(metricKey -> buildDailySnapshotItem(user, metricKey, date, dailyLatestMap))
                .toList();
        return new BodyMetricDailySnapshotResponse(date, items);
    }

    public BodyMetricHistoryResponse getHistory(
            Long userId,
            BodyMetricTrendMetricKey metricKey,
            LocalDateTime cursorMeasuredAt,
            Long cursorId,
            Integer pageSize
    ) {
        UserProfile user = getUser(userId);
        if (metricKey == BodyMetricTrendMetricKey.BMI && !hasValidHeight(user.getHeight())) {
            return new BodyMetricHistoryResponse(
                    metricKey,
                    metricKey.unitLabel(),
                    List.of(),
                    false,
                    null,
                    null
            );
        }
        if ((cursorMeasuredAt == null) != (cursorId == null)) {
            throw new IllegalArgumentException("cursorMeasuredAt and cursorId must be provided together");
        }

        int resolvedPageSize = resolvePageSize(pageSize);
        BodyMetricType sourceMetricType = resolveSourceMetricType(metricKey);
        List<BodyMetricRecord> queryResult = bodyMetricRecordRepository.findByMetricTypeWithCursor(
                user.getId(),
                sourceMetricType,
                cursorMeasuredAt,
                cursorId,
                resolvedPageSize + 1
        );
        boolean hasMore = queryResult.size() > resolvedPageSize;
        List<BodyMetricRecord> pageRecords = hasMore
                ? queryResult.subList(0, resolvedPageSize)
                : queryResult;

        LocalDateTime nextCursorMeasuredAt = null;
        Long nextCursorId = null;
        if (hasMore && !pageRecords.isEmpty()) {
            BodyMetricRecord oldestInPage = pageRecords.get(pageRecords.size() - 1);
            nextCursorMeasuredAt = oldestInPage.getMeasuredAt();
            nextCursorId = oldestInPage.getId();
        }

        return new BodyMetricHistoryResponse(
                metricKey,
                metricKey.unitLabel(),
                toHistoryRecords(metricKey, user, pageRecords),
                hasMore,
                nextCursorMeasuredAt,
                nextCursorId
        );
    }

    public BodyMetricTrendResponse getTrend(
            Long userId,
            BodyMetricTrendMetricKey metricKey,
            MetricTrendRangeType rangeType,
            LocalDateTime cursorMeasuredAt,
            Long cursorId,
            Integer pageSize
    ) {
        return getTrend(userId, metricKey, rangeType, cursorMeasuredAt, cursorId, pageSize, null);
    }

    public BodyMetricTrendResponse getTrend(
            Long userId,
            BodyMetricTrendMetricKey metricKey,
            MetricTrendRangeType rangeType,
            LocalDateTime cursorMeasuredAt,
            Long cursorId,
            Integer pageSize,
            MetricTrendGranularity granularity
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
        MetricTrendGranularity resolvedGranularity = resolveGranularity(rangeType, granularity);
        if (rangeType == MetricTrendRangeType.ALL) {
            if ((cursorMeasuredAt == null) != (cursorId == null)) {
                throw new IllegalArgumentException("cursorMeasuredAt and cursorId must be provided together");
            }
            if (resolvedGranularity == MetricTrendGranularity.MONTH) {
                List<BodyMetricRecord> records = fetchAllDailyLatestRecords(user.getId(), sourceMetricType);
                List<BodyMetricRecord> sortedAscRecords = sortTrendRecordsAsc(records);
                return new BodyMetricTrendResponse(
                        metricKey,
                        rangeType,
                        metricKey.unitLabel(),
                        aggregateMonthly(toTrendPoints(metricKey, user, sortedAscRecords)),
                        false,
                        null,
                        null
                );
            }
            int resolvedPageSize = resolvePageSize(pageSize);
            List<BodyMetricRecord> queryResult = bodyMetricRecordRepository.findDailyLatestByMetricTypeWithCursor(
                    user.getId(),
                    sourceMetricType,
                    cursorMeasuredAt,
                    cursorId,
                    resolvedPageSize + 1
            );
            boolean hasMore = queryResult.size() > resolvedPageSize;
            List<BodyMetricRecord> pageRecords = hasMore
                    ? queryResult.subList(0, resolvedPageSize)
                    : queryResult;

            LocalDateTime nextCursorMeasuredAt = null;
            Long nextCursorId = null;
            if (hasMore && !pageRecords.isEmpty()) {
                BodyMetricRecord oldestInPage = pageRecords.get(pageRecords.size() - 1);
                nextCursorMeasuredAt = oldestInPage.getMeasuredAt();
                nextCursorId = oldestInPage.getId();
            }

            List<BodyMetricRecord> sortedAscRecords = sortTrendRecordsAsc(pageRecords);

            return new BodyMetricTrendResponse(
                    metricKey,
                    rangeType,
                    metricKey.unitLabel(),
                    toTrendPoints(metricKey, user, sortedAscRecords),
                    hasMore,
                    nextCursorMeasuredAt,
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
        List<BodyMetricTrendPointResponse> points = toTrendPoints(metricKey, user, records);
        if (resolvedGranularity == MetricTrendGranularity.MONTH) {
            points = aggregateMonthly(points);
        }
        return new BodyMetricTrendResponse(
                metricKey,
                rangeType,
                metricKey.unitLabel(),
                points,
                false,
                null,
                null
        );
    }

    private List<BodyMetricRecord> fetchAllDailyLatestRecords(Long userId, BodyMetricType metricType) {
        List<BodyMetricRecord> records = new ArrayList<>();
        LocalDateTime cursorMeasuredAt = null;
        Long cursorId = null;
        boolean hasMore = true;
        while (hasMore && records.size() < MAX_AGGREGATION_RECORDS) {
            List<BodyMetricRecord> queryResult = bodyMetricRecordRepository.findDailyLatestByMetricTypeWithCursor(
                    userId,
                    metricType,
                    cursorMeasuredAt,
                    cursorId,
                    MAX_ALL_PAGE_SIZE + 1
            );
            hasMore = queryResult.size() > MAX_ALL_PAGE_SIZE;
            List<BodyMetricRecord> pageRecords = hasMore
                    ? queryResult.subList(0, MAX_ALL_PAGE_SIZE)
                    : queryResult;
            records.addAll(pageRecords);
            if (!hasMore || pageRecords.isEmpty()) {
                break;
            }
            BodyMetricRecord oldestInPage = pageRecords.get(pageRecords.size() - 1);
            cursorMeasuredAt = oldestInPage.getMeasuredAt();
            cursorId = oldestInPage.getId();
        }
        return records;
    }

    private List<BodyMetricRecord> sortTrendRecordsAsc(List<BodyMetricRecord> records) {
        List<BodyMetricRecord> sortedAscRecords = new ArrayList<>(records);
        sortedAscRecords.sort(Comparator
                .comparing(BodyMetricRecord::getRecordDate)
                .thenComparing(BodyMetricRecord::getMeasuredAt)
                .thenComparing(BodyMetricRecord::getId));
        return sortedAscRecords;
    }

    private List<BodyMetricTrendPointResponse> aggregateMonthly(List<BodyMetricTrendPointResponse> points) {
        Map<YearMonth, BodyMetricTrendPointResponse> latestPointByMonth = new LinkedHashMap<>();
        for (BodyMetricTrendPointResponse point : points) {
            latestPointByMonth.put(YearMonth.from(point.date()), point);
        }
        return List.copyOf(latestPointByMonth.values());
    }

    private MetricTrendGranularity resolveGranularity(MetricTrendRangeType rangeType, MetricTrendGranularity granularity) {
        if (granularity == null || granularity == MetricTrendGranularity.DAY) {
            return MetricTrendGranularity.DAY;
        }
        if (granularity == MetricTrendGranularity.MONTH) {
            return MetricTrendGranularity.MONTH;
        }
        return rangeType == MetricTrendRangeType.MONTH
                ? MetricTrendGranularity.DAY
                : MetricTrendGranularity.MONTH;
    }

    private List<BodyMetricHistoryRecordResponse> toHistoryRecords(
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
                        return new BodyMetricHistoryRecordResponse(
                                record.getId(),
                                record.getRecordDate(),
                                record.getMeasuredAt(),
                                record.getCreatedAt(),
                                bmi,
                                metricKey.unit()
                        );
                    })
                    .filter(java.util.Objects::nonNull)
                    .toList();
        }

        return records.stream()
                .map(record -> new BodyMetricHistoryRecordResponse(
                        record.getId(),
                        record.getRecordDate(),
                        record.getMeasuredAt(),
                        record.getCreatedAt(),
                        record.getMetricValue(),
                        record.getUnit()
                ))
                .toList();
    }

    private BodyMetricSnapshotItemResponse buildSnapshotItem(UserProfile user, BodyMetricTrendMetricKey metricKey) {
        if (metricKey == BodyMetricTrendMetricKey.BMI) {
            return buildBmiSnapshotItem(user);
        }
        BodyMetricRecord latestRecord = bodyMetricRecordRepository.findLatestByMetricType(user.getId(), metricKey.metricType())
                .orElse(null);
        return toSnapshotItem(metricKey, latestRecord);
    }

    private BodyMetricSnapshotItemResponse buildDailySnapshotItem(
            UserProfile user,
            BodyMetricTrendMetricKey metricKey,
            LocalDate date,
            Map<BodyMetricType, BodyMetricRecord> dailyLatestMap
    ) {
        if (metricKey == BodyMetricTrendMetricKey.BMI) {
            BodyMetricRecord latestWeightRecord = dailyLatestMap.get(BodyMetricType.WEIGHT);
            if (latestWeightRecord == null) {
                return new BodyMetricSnapshotItemResponse(
                        BodyMetricTrendMetricKey.BMI,
                        null,
                        BodyMetricTrendMetricKey.BMI.unitLabel(),
                        null,
                        null
                );
            }
            BigDecimal bmi = calculateBmi(latestWeightRecord.getMetricValue(), user.getHeight());
            return new BodyMetricSnapshotItemResponse(
                    BodyMetricTrendMetricKey.BMI,
                    bmi,
                    BodyMetricTrendMetricKey.BMI.unitLabel(),
                    bmi == null ? null : date,
                    bmi == null ? null : latestWeightRecord.getMeasuredAt()
            );
        }
        return toSnapshotItem(metricKey, dailyLatestMap.get(metricKey.metricType()));
    }

    private BodyMetricSnapshotItemResponse buildBmiSnapshotItem(UserProfile user) {
        BodyMetricRecord latestWeightRecord = bodyMetricRecordRepository.findLatestByMetricType(
                user.getId(),
                BodyMetricType.WEIGHT
        ).orElse(null);
        if (latestWeightRecord == null) {
            return new BodyMetricSnapshotItemResponse(BodyMetricTrendMetricKey.BMI, null, BodyMetricTrendMetricKey.BMI.unitLabel(), null, null);
        }
        BigDecimal bmi = calculateBmi(latestWeightRecord.getMetricValue(), user.getHeight());
        return new BodyMetricSnapshotItemResponse(
                BodyMetricTrendMetricKey.BMI,
                bmi,
                BodyMetricTrendMetricKey.BMI.unitLabel(),
                bmi == null ? null : latestWeightRecord.getRecordDate(),
                bmi == null ? null : latestWeightRecord.getMeasuredAt()
        );
    }

    private BodyMetricSnapshotItemResponse toSnapshotItem(BodyMetricTrendMetricKey metricKey, BodyMetricRecord record) {
        return new BodyMetricSnapshotItemResponse(
                metricKey,
                record == null ? null : record.getMetricValue(),
                metricKey.unitLabel(),
                record == null ? null : record.getRecordDate(),
                record == null ? null : record.getMeasuredAt()
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

    private UserProfile getUser(Long id) {
        return userProfileRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("user not found, id=" + id));
    }
}
