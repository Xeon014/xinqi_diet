package com.diet.controller;

import com.diet.auth.AuthContextService;
import com.diet.common.ApiResponse;
import com.diet.dto.user.CreateUserRequest;
import com.diet.dto.user.DailySummaryResponse;
import com.diet.dto.user.GoalPlanPreviewResponse;
import com.diet.dto.user.ProgressSummaryResponse;
import com.diet.dto.user.UpdateUserRequest;
import com.diet.dto.user.UserListResponse;
import com.diet.dto.user.UserResponse;
import com.diet.service.DailySummaryQueryService;
import com.diet.service.ProgressQueryService;
import com.diet.service.UserGoalPlanApplicationService;
import com.diet.service.UserProfileApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "用户资料", description = "用户资料维护、每日汇总和进度趋势接口")
@RestController
@RequestMapping("/api/users")
public class UserProfileController {

    private final UserProfileApplicationService userProfileApplicationService;

    private final UserGoalPlanApplicationService userGoalPlanApplicationService;

    private final DailySummaryQueryService dailySummaryQueryService;

    private final ProgressQueryService progressQueryService;

    private final AuthContextService authContextService;

    public UserProfileController(
            UserProfileApplicationService userProfileApplicationService,
            UserGoalPlanApplicationService userGoalPlanApplicationService,
            DailySummaryQueryService dailySummaryQueryService,
            ProgressQueryService progressQueryService,
            AuthContextService authContextService
    ) {
        this.userProfileApplicationService = userProfileApplicationService;
        this.userGoalPlanApplicationService = userGoalPlanApplicationService;
        this.dailySummaryQueryService = dailySummaryQueryService;
        this.progressQueryService = progressQueryService;
        this.authContextService = authContextService;
    }

    @Operation(summary = "创建用户", description = "创建新的用户资料")
    @PostMapping
    public ResponseEntity<ApiResponse<UserResponse>> create(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(userProfileApplicationService.create(request)));
    }

    @Operation(summary = "查询用户列表", description = "查询系统中的所有用户资料")
    @GetMapping
    public ApiResponse<UserListResponse> findAll() {
        List<UserResponse> users = userProfileApplicationService.findAll();
        return ApiResponse.success(new UserListResponse(users, users.size()));
    }

    @Operation(summary = "查询用户详情", description = "根据用户 ID 查询资料详情")
    @GetMapping("/{id}")
    public ApiResponse<UserResponse> findById(
            @Parameter(description = "用户 ID") @PathVariable Long id,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.resolveUserId(httpServletRequest, id);
        return ApiResponse.success(userProfileApplicationService.findById(userId));
    }

    @Operation(summary = "更新用户资料", description = "更新用户基础资料和目标信息")
    @PutMapping("/{id}")
    public ApiResponse<UserResponse> update(
            @Parameter(description = "用户 ID") @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.resolveUserId(httpServletRequest, id);
        return ApiResponse.success(userProfileApplicationService.update(userId, request));
    }

    @Operation(summary = "预览目标计划", description = "根据当前资料与目标设置预览推荐目标热量和风险提示")
    @PostMapping("/{id}/goal-plan-preview")
    public ApiResponse<GoalPlanPreviewResponse> previewGoalPlan(
            @Parameter(description = "用户 ID") @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.resolveUserId(httpServletRequest, id);
        return ApiResponse.success(userGoalPlanApplicationService.previewGoalPlan(userId, request));
    }

    @Operation(summary = "查询每日汇总", description = "查询指定用户在某一天的热量摄入与营养汇总")
    @GetMapping("/{id}/daily-summary")
    public ApiResponse<DailySummaryResponse> getDailySummary(
            @Parameter(description = "用户 ID") @PathVariable Long id,
            @Parameter(description = "查询日期，格式 yyyy-MM-dd")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.resolveUserId(httpServletRequest, id);
        return ApiResponse.success(dailySummaryQueryService.getDailySummary(userId, date));
    }

    @Operation(summary = "查询进度趋势", description = "查询指定时间范围内的热量趋势和减重进度")
    @GetMapping("/{id}/progress")
    public ApiResponse<ProgressSummaryResponse> getProgress(
            @Parameter(description = "用户 ID") @PathVariable Long id,
            @Parameter(description = "开始日期，格式 yyyy-MM-dd")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "结束日期，格式 yyyy-MM-dd")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.resolveUserId(httpServletRequest, id);
        return ApiResponse.success(progressQueryService.getProgress(userId, startDate, endDate));
    }
}
