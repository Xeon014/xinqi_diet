package com.diet.app.metric;

import com.diet.app.user.GoalPlanningService;
import com.diet.domain.metric.BodyMetricRecord;
import com.diet.domain.metric.BodyMetricRecordRepository;
import com.diet.domain.metric.BodyMetricType;
import com.diet.domain.metric.BodyMetricUnit;
import com.diet.domain.user.GoalCalorieStrategy;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.api.metric.BodyMetricDeleteResponse;
import com.diet.api.metric.BodyMetricRecordResponse;
import com.diet.api.metric.CreateBodyMetricRecordRequest;
import com.diet.types.common.NotFoundException;
import com.diet.api.user.GoalPlanPreviewResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class BodyMetricRecordCommandService {

    private final BodyMetricRecordRepository bodyMetricRecordRepository;

    private final UserProfileRepository userProfileRepository;

    private final GoalPlanningService goalPlanningService;

    public BodyMetricRecordCommandService(
            BodyMetricRecordRepository bodyMetricRecordRepository,
            UserProfileRepository userProfileRepository,
            GoalPlanningService goalPlanningService
    ) {
        this.bodyMetricRecordRepository = bodyMetricRecordRepository;
        this.userProfileRepository = userProfileRepository;
        this.goalPlanningService = goalPlanningService;
    }

    public BodyMetricRecordResponse create(Long userId, CreateBodyMetricRecordRequest request) {
        UserProfile user = getUser(userId);
        validateUnit(request.metricType(), request.unit());
        LocalDateTime measuredAt = resolveMeasuredAt(request);
        LocalDate recordDate = measuredAt.toLocalDate();

        BodyMetricRecord record = new BodyMetricRecord(
                user.getId(),
                request.metricType(),
                request.metricValue(),
                request.unit(),
                recordDate,
                measuredAt
        );
        bodyMetricRecordRepository.save(record);

        if (request.metricType() == BodyMetricType.WEIGHT) {
            syncCurrentWeightFromLatestWeight(user);
        }

        return new BodyMetricRecordResponse(
                record.getId(),
                record.getUserId(),
                record.getMetricType(),
                record.getMetricValue(),
                record.getUnit(),
                record.getRecordDate(),
                record.getMeasuredAt(),
                record.getCreatedAt()
        );
    }

    public BodyMetricDeleteResponse delete(Long userId, Long recordId) {
        UserProfile user = getUser(userId);
        BodyMetricRecord existing = bodyMetricRecordRepository.findByIdAndUserId(recordId, userId)
                .orElseThrow(() -> new NotFoundException("body metric record not found, id=" + recordId));
        bodyMetricRecordRepository.deleteById(existing.getId());
        if (existing.getMetricType() == BodyMetricType.WEIGHT) {
            syncCurrentWeightFromLatestWeight(user);
        }
        return new BodyMetricDeleteResponse(true);
    }

    public void seedInitialWeightRecord(Long userId, BigDecimal currentWeight, LocalDate recordDate) {
        if (currentWeight == null || recordDate == null) {
            return;
        }
        if (bodyMetricRecordRepository.findLatestByMetricType(userId, BodyMetricType.WEIGHT).isPresent()) {
            return;
        }
        bodyMetricRecordRepository.save(new BodyMetricRecord(
                userId,
                BodyMetricType.WEIGHT,
                currentWeight,
                BodyMetricUnit.KG,
                recordDate,
                recordDate.atStartOfDay()
        ));
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

    private LocalDateTime resolveMeasuredAt(CreateBodyMetricRecordRequest request) {
        if (request.measuredAt() != null) {
            return truncateToMinute(request.measuredAt());
        }
        return LocalDateTime.of(
                request.recordDate(),
                LocalTime.now().truncatedTo(ChronoUnit.MINUTES)
        );
    }

    private LocalDateTime truncateToMinute(LocalDateTime measuredAt) {
        return measuredAt.truncatedTo(ChronoUnit.MINUTES);
    }

    private void syncCurrentWeightFromLatestWeight(UserProfile user) {
        java.util.Optional<BodyMetricRecord> latestWeightOptional = bodyMetricRecordRepository.findLatestByMetricType(
                user.getId(),
                BodyMetricType.WEIGHT
        );
        BodyMetricRecord latestWeightRecord = latestWeightOptional == null ? null : latestWeightOptional.orElse(null);
        if (latestWeightRecord == null) {
            return;
        }
        if (user.getCurrentWeight() != null
                && user.getCurrentWeight().compareTo(latestWeightRecord.getMetricValue()) == 0) {
            return;
        }
        user.setCurrentWeight(latestWeightRecord.getMetricValue());
        refreshSmartGoalSnapshot(user);
        userProfileRepository.update(user);
    }

    private void refreshSmartGoalSnapshot(UserProfile user) {
        if (user.resolveGoalCalorieStrategy() != GoalCalorieStrategy.SMART) {
            return;
        }
        try {
            GoalPlanPreviewResponse preview = goalPlanningService.preview(new GoalPlanningService.GoalPlanningProfile(
                    user.getId(),
                    user.getGender(),
                    user.getBirthDate(),
                    user.getHeight(),
                    user.getCurrentWeight(),
                    user.getTargetWeight(),
                    user.getCustomBmr(),
                    user.getCustomTdee(),
                    user.getDailyCalorieTarget(),
                    user.getGoalMode(),
                    user.getGoalCalorieDelta(),
                    user.getDailyCalorieTarget(),
                    user.getGoalMode(),
                    user.getGoalCalorieDelta(),
                    user.getGoalTargetDate(),
                    user.resolveGoalCalorieStrategy()
            ));
            user.setDailyCalorieTarget(preview.recommendedDailyCalorieTarget());
            user.setGoalMode(preview.goalMode());
            user.setGoalCalorieDelta(preview.recommendedGoalCalorieDelta());
        } catch (IllegalArgumentException ignored) {
        }
    }
}
