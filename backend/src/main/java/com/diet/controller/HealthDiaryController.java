package com.diet.controller;

import com.diet.auth.AuthContextService;
import com.diet.common.ApiResponse;
import com.diet.dto.diary.HealthDiaryDeleteResponse;
import com.diet.dto.diary.HealthDiaryResponse;
import com.diet.dto.diary.HealthDiaryUpsertRequest;
import com.diet.dto.diary.HealthDiaryUpsertResponse;
import com.diet.service.HealthDiaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "健康日记", description = "按日期保存和查询健康日记")
@RestController
@RequestMapping("/api/health-diaries")
public class HealthDiaryController {

    private final HealthDiaryService healthDiaryService;

    private final AuthContextService authContextService;

    public HealthDiaryController(HealthDiaryService healthDiaryService, AuthContextService authContextService) {
        this.healthDiaryService = healthDiaryService;
        this.authContextService = authContextService;
    }

    @Operation(summary = "查询某日日记", description = "按日期查询当前登录用户的健康日记，不存在时返回 null")
    @GetMapping("/daily")
    public ApiResponse<HealthDiaryResponse> findDaily(
            @Parameter(description = "记录日期，格式 yyyy-MM-dd")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(healthDiaryService.findDaily(userId, date).orElse(null));
    }

    @Operation(summary = "保存某日日记", description = "按日期保存（新建或覆盖更新）当前登录用户的健康日记")
    @PutMapping("/daily")
    public ApiResponse<HealthDiaryUpsertResponse> upsert(
            @Valid @RequestBody HealthDiaryUpsertRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(healthDiaryService.upsert(userId, request));
    }

    @Operation(summary = "删除某日日记", description = "按日期删除当前登录用户的健康日记")
    @DeleteMapping("/daily")
    public ApiResponse<HealthDiaryDeleteResponse> deleteByDate(
            @Parameter(description = "记录日期，格式 yyyy-MM-dd")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(healthDiaryService.deleteByDate(userId, date));
    }
}
