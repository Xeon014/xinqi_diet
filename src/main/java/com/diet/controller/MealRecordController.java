package com.diet.controller;

import com.diet.common.ApiResponse;
import com.diet.dto.record.CreateMealRecordRequest;
import com.diet.dto.record.MealRecordListResponse;
import com.diet.dto.record.MealRecordResponse;
import com.diet.service.MealRecordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "饮食记录", description = "饮食记录创建与查询接口")
@RestController
@RequestMapping("/api/records")
public class MealRecordController {

    private final MealRecordService mealRecordService;

    public MealRecordController(MealRecordService mealRecordService) {
        this.mealRecordService = mealRecordService;
    }

    @Operation(summary = "新增饮食记录", description = "为指定用户新增一条饮食记录")
    @PostMapping
    public ResponseEntity<ApiResponse<MealRecordResponse>> create(@Valid @RequestBody CreateMealRecordRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(mealRecordService.create(request)));
    }

    @Operation(summary = "查询饮食记录", description = "按用户和日期查询饮食记录列表")
    @GetMapping
    public ApiResponse<MealRecordListResponse> findByUserAndDate(
            @Parameter(description = "用户ID") @RequestParam Long userId,
            @Parameter(description = "记录日期，格式yyyy-MM-dd")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        List<MealRecordResponse> records = mealRecordService.findByUserAndDate(userId, date);
        return ApiResponse.success(new MealRecordListResponse(userId, date, records, records.size()));
    }
}