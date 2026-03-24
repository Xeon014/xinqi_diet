package com.diet.trigger.controller;

import com.diet.trigger.support.AuthContextService;
import com.diet.types.common.ApiResponse;
import com.diet.api.metric.BodyMetricDailySnapshotResponse;
import com.diet.api.metric.BodyMetricDeleteResponse;
import com.diet.api.metric.BodyMetricHistoryResponse;
import com.diet.api.metric.BodyMetricRecordResponse;
import com.diet.api.metric.BodyMetricSnapshotResponse;
import com.diet.api.metric.BodyMetricTrendMetricKey;
import com.diet.api.metric.BodyMetricTrendResponse;
import com.diet.api.metric.CreateBodyMetricRecordRequest;
import com.diet.api.metric.MetricTrendRangeType;
import com.diet.app.metric.BodyMetricRecordCommandService;
import com.diet.app.metric.BodyMetricRecordQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "身体指标记录", description = "身体指标记录、历史和趋势查询接口")
@RestController
@RequestMapping("/api/body-metrics")
public class BodyMetricRecordController {

    private final BodyMetricRecordCommandService bodyMetricRecordCommandService;

    private final BodyMetricRecordQueryService bodyMetricRecordQueryService;

    private final AuthContextService authContextService;

    public BodyMetricRecordController(
            BodyMetricRecordCommandService bodyMetricRecordCommandService,
            BodyMetricRecordQueryService bodyMetricRecordQueryService,
            AuthContextService authContextService
    ) {
        this.bodyMetricRecordCommandService = bodyMetricRecordCommandService;
        this.bodyMetricRecordQueryService = bodyMetricRecordQueryService;
        this.authContextService = authContextService;
    }

    @Operation(summary = "新增身体指标记录", description = "新增一条身体指标记录，同一天可记录多条")
    @PostMapping
    public ResponseEntity<ApiResponse<BodyMetricRecordResponse>> create(
            @Valid @RequestBody CreateBodyMetricRecordRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(bodyMetricRecordCommandService.create(userId, request)));
    }

    @Operation(summary = "查询身体指标快照", description = "返回体重、BMI 和围度的最近一次记录值与日期")
    @GetMapping("/snapshot")
    public ApiResponse<BodyMetricSnapshotResponse> getSnapshot(HttpServletRequest httpServletRequest) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(bodyMetricRecordQueryService.getSnapshot(userId));
    }

    @Operation(summary = "按日期查询身体指标快照", description = "返回指定日期各指标的最新记录值，适用于首页按日展示")
    @GetMapping("/daily")
    public ApiResponse<BodyMetricDailySnapshotResponse> getDailySnapshot(
            @Parameter(description = "查询日期，格式 yyyy-MM-dd")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(bodyMetricRecordQueryService.getDailySnapshot(userId, date));
    }

    @Operation(summary = "删除身体指标记录", description = "删除当前登录用户的一条身体指标记录")
    @DeleteMapping("/{id}")
    public ApiResponse<BodyMetricDeleteResponse> delete(
            @Parameter(description = "记录 ID") @PathVariable Long id,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(bodyMetricRecordCommandService.delete(userId, id));
    }

    @Operation(summary = "查询身体指标历史明细", description = "按指标查询历史明细列表，支持游标分页，同一天可返回多条记录")
    @GetMapping("/history")
    public ApiResponse<BodyMetricHistoryResponse> getHistory(
            @Parameter(description = "指标类型")
            @RequestParam BodyMetricTrendMetricKey metricKey,
            @Parameter(description = "游标日期，格式 yyyy-MM-dd")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate cursorDate,
            @Parameter(description = "游标记录 ID")
            @RequestParam(required = false) Long cursorId,
            @Parameter(description = "分页大小，默认 120")
            @RequestParam(required = false) Integer pageSize,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(bodyMetricRecordQueryService.getHistory(userId, metricKey, cursorDate, cursorId, pageSize));
    }

    @Operation(summary = "查询身体指标趋势", description = "按指标和时间区间查询趋势点，ALL 支持游标分页")
    @GetMapping("/trend")
    public ApiResponse<BodyMetricTrendResponse> getTrend(
            @Parameter(description = "指标类型")
            @RequestParam BodyMetricTrendMetricKey metricKey,
            @Parameter(description = "时间区间，MONTH/YEAR/ALL")
            @RequestParam MetricTrendRangeType rangeType,
            @Parameter(description = "游标日期，仅 ALL 模式使用，格式 yyyy-MM-dd")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate cursorDate,
            @Parameter(description = "游标记录 ID，仅 ALL 模式使用")
            @RequestParam(required = false) Long cursorId,
            @Parameter(description = "分页大小，仅 ALL 模式使用，默认 120")
            @RequestParam(required = false) Integer pageSize,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(bodyMetricRecordQueryService.getTrend(userId, metricKey, rangeType, cursorDate, cursorId, pageSize));
    }
}
