package com.diet.controller;

import com.diet.auth.AuthContextService;
import com.diet.common.ApiResponse;
import com.diet.dto.metric.BodyMetricRecordResponse;
import com.diet.dto.metric.BodyMetricSnapshotResponse;
import com.diet.dto.metric.BodyMetricTrendMetricKey;
import com.diet.dto.metric.BodyMetricTrendResponse;
import com.diet.dto.metric.CreateBodyMetricRecordRequest;
import com.diet.dto.metric.MetricTrendRangeType;
import com.diet.service.BodyMetricRecordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "身体指标记录", description = "身体指标记录与趋势查询接口")
@RestController
@RequestMapping("/api/body-metrics")
public class BodyMetricRecordController {

    private final BodyMetricRecordService bodyMetricRecordService;

    private final AuthContextService authContextService;

    public BodyMetricRecordController(
            BodyMetricRecordService bodyMetricRecordService,
            AuthContextService authContextService
    ) {
        this.bodyMetricRecordService = bodyMetricRecordService;
        this.authContextService = authContextService;
    }

    @Operation(summary = "新增身体指标记录", description = "新增一条身体指标记录，同一天可记录多条")
    @PostMapping
    public ResponseEntity<ApiResponse<BodyMetricRecordResponse>> create(
            @Valid @RequestBody CreateBodyMetricRecordRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.resolveUserId(httpServletRequest, request.userId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(bodyMetricRecordService.create(userId, request)));
    }

    @Operation(summary = "查询身体指标快照", description = "返回体重、BMI 和围度的最近一次记录值与日期")
    @GetMapping("/snapshot")
    public ApiResponse<BodyMetricSnapshotResponse> getSnapshot(HttpServletRequest httpServletRequest) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(bodyMetricRecordService.getSnapshot(userId));
    }

    @Operation(summary = "查询身体指标趋势", description = "按指标和时间区间查询趋势点，ALL 支持游标分页")
    @GetMapping("/trend")
    public ApiResponse<BodyMetricTrendResponse> getTrend(
            @Parameter(description = "指标类型")
            @RequestParam BodyMetricTrendMetricKey metricKey,
            @Parameter(description = "时间区间：MONTH/YEAR/ALL")
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
        return ApiResponse.success(bodyMetricRecordService.getTrend(userId, metricKey, rangeType, cursorDate, cursorId, pageSize));
    }
}
