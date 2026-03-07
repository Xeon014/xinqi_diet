package com.diet.user;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.diet.common.ConflictException;
import com.diet.common.NotFoundException;
import com.diet.record.MealRecord;
import com.diet.record.MealRecordService;
import com.diet.record.dto.MealRecordResponse;
import com.diet.user.dto.CreateUserRequest;
import com.diet.user.dto.DailySummaryResponse;
import com.diet.user.dto.ProgressPointResponse;
import com.diet.user.dto.ProgressSummaryResponse;
import com.diet.user.dto.UpdateUserRequest;
import com.diet.user.dto.UserResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;
    private final MealRecordService mealRecordService;

    public UserProfileService(UserProfileRepository userProfileRepository, MealRecordService mealRecordService) {
        this.userProfileRepository = userProfileRepository;
        this.mealRecordService = mealRecordService;
    }

    public UserResponse create(CreateUserRequest request) {
        if (userProfileRepository.findByEmail(request.email()) != null) {
            throw new ConflictException("email already in use: " + request.email());
        }

        UserProfile user = new UserProfile(
                request.name(),
                request.email(),
                request.dailyCalorieTarget(),
                request.currentWeight(),
                request.targetWeight()
        );
        userProfileRepository.insert(user);
        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> findAll() {
        return userProfileRepository.selectList(new LambdaQueryWrapper<UserProfile>()
                        .orderByAsc(UserProfile::getId))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse findById(Long id) {
        return toResponse(getUser(id));
    }

    public UserResponse update(Long id, UpdateUserRequest request) {
        UserProfile user = getUser(id);
        user.updateProfile(
                request.name(),
                request.dailyCalorieTarget(),
                request.currentWeight(),
                request.targetWeight()
        );
        userProfileRepository.updateById(user);
        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public DailySummaryResponse getDailySummary(Long userId, LocalDate date) {
        UserProfile user = getUser(userId);
        List<MealRecord> records = mealRecordService.findEntitiesByUserAndDate(userId, date);
        Map<Long, String> foodNames = mealRecordService.loadFoodNames(records);
        BigDecimal consumed = sumCalories(records);
        BigDecimal remaining = BigDecimal.valueOf(user.getDailyCalorieTarget()).subtract(consumed);

        List<MealRecordResponse> responses = records.stream()
                .map(record -> mealRecordService.toResponse(record, foodNames.get(record.getFoodId())))
                .toList();

        return new DailySummaryResponse(
                userId,
                date,
                user.getDailyCalorieTarget(),
                consumed,
                remaining,
                remaining.compareTo(BigDecimal.ZERO) < 0,
                responses
        );
    }

    @Transactional(readOnly = true)
    public ProgressSummaryResponse getProgress(Long userId, LocalDate startDate, LocalDate endDate) {
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("endDate must not be before startDate");
        }

        UserProfile user = getUser(userId);
        List<MealRecord> records = mealRecordService.findEntitiesByUserAndDateRange(userId, startDate, endDate);

        List<ProgressPointResponse> trend = startDate.datesUntil(endDate.plusDays(1))
                .map(date -> buildPoint(user, date, records))
                .toList();

        BigDecimal totalCalories = trend.stream()
                .map(ProgressPointResponse::consumedCalories)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal averageCalories = trend.isEmpty()
                ? BigDecimal.ZERO
                : totalCalories.divide(BigDecimal.valueOf(trend.size()), 2, RoundingMode.HALF_UP);
        BigDecimal totalGap = trend.stream()
                .map(ProgressPointResponse::calorieGap)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal averageGap = trend.isEmpty()
                ? BigDecimal.ZERO
                : totalGap.divide(BigDecimal.valueOf(trend.size()), 2, RoundingMode.HALF_UP);

        return new ProgressSummaryResponse(
                userId,
                startDate,
                endDate,
                averageCalories,
                totalCalories,
                averageGap,
                user.getCurrentWeight().subtract(user.getTargetWeight()).max(BigDecimal.ZERO),
                trend
        );
    }

    private ProgressPointResponse buildPoint(UserProfile user, LocalDate date, List<MealRecord> records) {
        BigDecimal consumed = records.stream()
                .filter(record -> record.getRecordDate().equals(date))
                .map(MealRecord::getTotalCalories)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal gap = BigDecimal.valueOf(user.getDailyCalorieTarget()).subtract(consumed);
        return new ProgressPointResponse(date, consumed, user.getDailyCalorieTarget(), gap);
    }

    private BigDecimal sumCalories(List<MealRecord> records) {
        return records.stream()
                .map(MealRecord::getTotalCalories)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private UserProfile getUser(Long id) {
        UserProfile user = userProfileRepository.selectById(id);
        if (user == null) {
            throw new NotFoundException("user not found, id=" + id);
        }
        return user;
    }

    private UserResponse toResponse(UserProfile user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getDailyCalorieTarget(),
                user.getCurrentWeight(),
                user.getTargetWeight(),
                user.getCreatedAt()
        );
    }
}