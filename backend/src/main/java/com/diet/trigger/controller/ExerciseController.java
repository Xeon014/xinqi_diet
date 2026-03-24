package com.diet.trigger.controller;

import com.diet.trigger.support.AuthContextService;
import com.diet.types.common.ApiResponse;
import com.diet.api.exercise.CreateExerciseRequest;
import com.diet.api.exercise.ExerciseListResponse;
import com.diet.api.exercise.ExerciseResponse;
import com.diet.api.exercise.UpdateExerciseRequest;
import com.diet.app.exercise.ExerciseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "运动库", description = "运动项目新增与查询接口")
@RestController
@RequestMapping("/api/exercises")
public class ExerciseController {

    private final ExerciseService exerciseService;

    private final AuthContextService authContextService;

    public ExerciseController(ExerciseService exerciseService, AuthContextService authContextService) {
        this.exerciseService = exerciseService;
        this.authContextService = authContextService;
    }

    @Operation(summary = "创建运动项目", description = "新增一个自定义运动项目")
    @PostMapping
    public ResponseEntity<ApiResponse<ExerciseResponse>> create(
            @Valid @RequestBody CreateExerciseRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(exerciseService.create(userId, request)));
    }

    @Operation(summary = "编辑自定义运动", description = "编辑当前用户的自定义运动")
    @PutMapping("/{id}")
    public ApiResponse<ExerciseResponse> update(
            @Parameter(description = "运动 ID") @PathVariable Long id,
            @Valid @RequestBody UpdateExerciseRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(exerciseService.update(userId, id, request));
    }

    @Operation(summary = "删除自定义运动", description = "删除当前用户的自定义运动")
    @DeleteMapping("/{id}")
    public ApiResponse<Boolean> delete(
            @Parameter(description = "运动 ID") @PathVariable Long id,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(exerciseService.delete(userId, id));
    }

    @Operation(summary = "查询运动列表", description = "按关键词和分类筛选运动项目")
    @GetMapping
    public ApiResponse<ExerciseListResponse> findAll(
            @Parameter(description = "关键词，可选") @RequestParam(required = false) String keyword,
            @Parameter(description = "运动分类，可选") @RequestParam(required = false) String category,
            @Parameter(description = "查询范围，ALL 为全部可见运动，CUSTOM 为仅当前用户自定义")
            @RequestParam(required = false, defaultValue = ExerciseService.SCOPE_ALL) String scope,
            HttpServletRequest httpServletRequest
    ) {
        String normalizedScope = String.valueOf(scope).trim().toUpperCase();
        Long userId = ExerciseService.SCOPE_CUSTOM.equals(normalizedScope)
                ? authContextService.resolveUserId(httpServletRequest, null)
                : authContextService.getCurrentUserId(httpServletRequest);
        List<ExerciseResponse> exercises = exerciseService.findAll(userId, keyword, category, normalizedScope);
        return ApiResponse.success(new ExerciseListResponse(exercises, exercises.size()));
    }
}
