package com.diet.controller;

import com.diet.auth.AuthContextService;
import com.diet.common.ApiResponse;
import com.diet.dto.metric.BodyMetricRecordResponse;
import com.diet.dto.metric.CreateBodyMetricRecordRequest;
import com.diet.service.BodyMetricRecordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "身体指标记录", description = "身体指标历史记录接口（首期支持体重）")
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
}
