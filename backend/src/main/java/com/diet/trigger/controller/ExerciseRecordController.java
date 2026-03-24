package com.diet.trigger.controller;

import com.diet.trigger.support.AuthContextService;
import com.diet.types.common.ApiResponse;
import com.diet.api.exercise.CreateExerciseRecordRequest;
import com.diet.api.exercise.ExerciseRecordListResponse;
import com.diet.api.exercise.ExerciseRecordResponse;
import com.diet.api.exercise.UpdateExerciseRecordRequest;
import com.diet.app.record.exercise.ExerciseRecordCommandService;
import com.diet.app.record.exercise.ExerciseRecordQueryService;
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

@Tag(name = "运动记录", description = "运动记录创建、查询和编辑接口")
@RestController
@RequestMapping("/api/exercise-records")
public class ExerciseRecordController {

    private final ExerciseRecordCommandService exerciseRecordCommandService;

    private final ExerciseRecordQueryService exerciseRecordQueryService;

    private final AuthContextService authContextService;

    public ExerciseRecordController(
            ExerciseRecordCommandService exerciseRecordCommandService,
            ExerciseRecordQueryService exerciseRecordQueryService,
            AuthContextService authContextService
    ) {
        this.exerciseRecordCommandService = exerciseRecordCommandService;
        this.exerciseRecordQueryService = exerciseRecordQueryService;
        this.authContextService = authContextService;
    }

    @Operation(summary = "新增运动记录", description = "为当前用户新增一条运动记录")
    @PostMapping
    public ResponseEntity<ApiResponse<ExerciseRecordResponse>> create(
            @Valid @RequestBody CreateExerciseRecordRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(exerciseRecordCommandService.create(userId, request)));
    }

    @Operation(summary = "更新运动记录", description = "按记录 ID 更新时长、强度和日期")
    @PutMapping("/{id}")
    public ApiResponse<ExerciseRecordResponse> update(
            @Parameter(description = "运动记录 ID") @PathVariable Long id,
            @Valid @RequestBody UpdateExerciseRecordRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(exerciseRecordCommandService.update(userId, id, request));
    }

    @Operation(summary = "删除运动记录", description = "按记录 ID 删除当前用户的一条运动记录")
    @DeleteMapping("/{id}")
    public ApiResponse<Boolean> deleteById(
            @Parameter(description = "运动记录 ID") @PathVariable Long id,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(exerciseRecordCommandService.deleteById(userId, id));
    }

    @Operation(summary = "查询运动记录", description = "按用户和日期查询运动记录列表")
    @GetMapping
    public ApiResponse<ExerciseRecordListResponse> findByUserAndDate(
            @Parameter(description = "记录日期，格式 yyyy-MM-dd")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest httpServletRequest
    ) {
        Long resolvedUserId = authContextService.requireCurrentUserId(httpServletRequest);
        List<ExerciseRecordResponse> records = exerciseRecordQueryService.findByUserAndDate(resolvedUserId, date);
        return ApiResponse.success(new ExerciseRecordListResponse(resolvedUserId, date, records, records.size()));
    }
}
