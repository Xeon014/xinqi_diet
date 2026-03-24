package com.diet.trigger.controller;

import com.diet.trigger.support.AuthContextService;
import com.diet.types.common.ApiResponse;
import com.diet.domain.record.MealType;
import com.diet.api.record.CreateMealRecordBatchRequest;
import com.diet.api.record.CreateMealRecordRequest;
import com.diet.api.record.MealRecordListResponse;
import com.diet.api.record.MealRecordResponse;
import com.diet.api.record.UpdateMealRecordRequest;
import com.diet.app.record.meal.MealRecordCommandService;
import com.diet.app.record.meal.MealRecordQueryService;
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

    private final MealRecordCommandService mealRecordCommandService;

    private final MealRecordQueryService mealRecordQueryService;

    private final AuthContextService authContextService;

    public MealRecordController(
            MealRecordCommandService mealRecordCommandService,
            MealRecordQueryService mealRecordQueryService,
            AuthContextService authContextService
    ) {
        this.mealRecordCommandService = mealRecordCommandService;
        this.mealRecordQueryService = mealRecordQueryService;
        this.authContextService = authContextService;
    }

    @Operation(summary = "新增饮食记录", description = "为当前用户新增一条饮食记录")
    @PostMapping
    public ResponseEntity<ApiResponse<MealRecordResponse>> create(
            @Valid @RequestBody CreateMealRecordRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(mealRecordCommandService.create(userId, request)));
    }

    @Operation(summary = "批量新增饮食记录", description = "同一餐次一次提交多种食物并保存")
    @PostMapping("/batch")
    public ResponseEntity<ApiResponse<MealRecordListResponse>> createBatch(
            @Valid @RequestBody CreateMealRecordBatchRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        List<MealRecordResponse> records = mealRecordCommandService.createBatch(userId, request);
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
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(mealRecordCommandService.updateRecord(userId, id, request));
    }

    @Operation(summary = "删除饮食记录", description = "按记录 ID 删除当前用户的一条饮食记录")
    @DeleteMapping("/{id}")
    public ApiResponse<Boolean> deleteById(
            @Parameter(description = "饮食记录 ID") @PathVariable Long id,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(mealRecordCommandService.deleteById(userId, id));
    }

    @Operation(summary = "查询饮食记录", description = "按用户、日期和可选餐次查询饮食记录列表")
    @GetMapping
    public ApiResponse<MealRecordListResponse> findByUserAndDate(
            @Parameter(description = "记录日期，格式 yyyy-MM-dd")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Parameter(description = "餐次类型，可选值 BREAKFAST/MORNING_SNACK/LUNCH/AFTERNOON_SNACK/DINNER/LATE_NIGHT_SNACK/OTHER")
            @RequestParam(required = false) MealType mealType,
            HttpServletRequest httpServletRequest
    ) {
        Long resolvedUserId = authContextService.requireCurrentUserId(httpServletRequest);
        List<MealRecordResponse> records = mealRecordQueryService.findByUserAndDate(resolvedUserId, date, mealType);
        return ApiResponse.success(new MealRecordListResponse(resolvedUserId, date, records, records.size()));
    }
}
