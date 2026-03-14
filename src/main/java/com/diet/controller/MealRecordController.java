package com.diet.controller;

import com.diet.auth.AuthContextService;
import com.diet.common.ApiResponse;
import com.diet.domain.record.MealType;
import com.diet.dto.record.CreateMealRecordBatchRequest;
import com.diet.dto.record.CreateMealRecordRequest;
import com.diet.dto.record.MealRecordListResponse;
import com.diet.dto.record.MealRecordResponse;
import com.diet.dto.record.UpdateMealRecordRequest;
import com.diet.service.MealRecordService;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "饮食记录", description = "饮食记录创建、查询和编辑接口")
@RestController
@RequestMapping("/api/records")
public class MealRecordController {

    private final MealRecordService mealRecordService;

    private final AuthContextService authContextService;

    public MealRecordController(MealRecordService mealRecordService, AuthContextService authContextService) {
        this.mealRecordService = mealRecordService;
        this.authContextService = authContextService;
    }

    @Operation(summary = "新增饮食记录", description = "为当前用户新增一条饮食记录")
    @PostMapping
    public ResponseEntity<ApiResponse<MealRecordResponse>> create(
            @Valid @RequestBody CreateMealRecordRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.resolveUserId(httpServletRequest, request.userId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(mealRecordService.create(userId, request)));
    }

    @Operation(summary = "批量新增饮食记录", description = "同一餐次一次提交多种食物并保存")
    @PostMapping("/batch")
    public ResponseEntity<ApiResponse<MealRecordListResponse>> createBatch(
            @Valid @RequestBody CreateMealRecordBatchRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.resolveUserId(httpServletRequest, request.userId());
        List<MealRecordResponse> records = mealRecordService.createBatch(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(new MealRecordListResponse(
                        userId,
                        request.recordDate(),
                        records,
                        records.size()
                )));
    }

    @Operation(summary = "更新饮食记录", description = "按记录 ID 更新当前用户某条记录的克重、餐次和日期")
    @PutMapping("/{id}")
    public ApiResponse<MealRecordResponse> updateRecord(
            @Parameter(description = "饮食记录 ID") @PathVariable Long id,
            @Valid @RequestBody UpdateMealRecordRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.resolveUserId(httpServletRequest, null);
        return ApiResponse.success(mealRecordService.updateRecord(userId, id, request));
    }

    @Operation(summary = "删除饮食记录", description = "按记录 ID 删除当前用户的一条饮食记录")
    @DeleteMapping("/{id}")
    public ApiResponse<Boolean> deleteById(
            @Parameter(description = "饮食记录 ID") @PathVariable Long id,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.resolveUserId(httpServletRequest, null);
        return ApiResponse.success(mealRecordService.deleteById(userId, id));
    }

    @Operation(summary = "查询饮食记录", description = "按用户、日期和可选餐次查询饮食记录列表")
    @GetMapping
    public ApiResponse<MealRecordListResponse> findByUserAndDate(
            @Parameter(description = "用户 ID，可不传（由 token 自动识别）") @RequestParam(required = false) Long userId,
            @Parameter(description = "记录日期，格式 yyyy-MM-dd")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Parameter(description = "餐次类型，可选值 BREAKFAST/LUNCH/DINNER/SNACK")
            @RequestParam(required = false) MealType mealType,
            HttpServletRequest httpServletRequest
    ) {
        Long resolvedUserId = authContextService.resolveUserId(httpServletRequest, userId);
        List<MealRecordResponse> records = mealRecordService.findByUserAndDate(resolvedUserId, date, mealType);
        return ApiResponse.success(new MealRecordListResponse(resolvedUserId, date, records, records.size()));
    }
}
