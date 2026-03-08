package com.diet.controller;

import com.diet.common.ApiResponse;
import com.diet.dto.exercise.ExerciseListResponse;
import com.diet.dto.exercise.ExerciseResponse;
import com.diet.service.ExerciseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "运动库", description = "运动项目检索接口")
@RestController
@RequestMapping("/api/exercises")
public class ExerciseController {

    private final ExerciseService exerciseService;

    public ExerciseController(ExerciseService exerciseService) {
        this.exerciseService = exerciseService;
    }

    @Operation(summary = "查询运动列表", description = "按关键词和分类筛选运动项目")
    @GetMapping
    public ApiResponse<ExerciseListResponse> findAll(
            @Parameter(description = "关键词，可选") @RequestParam(required = false) String keyword,
            @Parameter(description = "运动分类，可选") @RequestParam(required = false) String category
    ) {
        List<ExerciseResponse> exercises = exerciseService.findAll(keyword, category);
        return ApiResponse.success(new ExerciseListResponse(exercises, exercises.size()));
    }
}