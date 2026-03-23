package com.diet.controller;

import com.diet.auth.AuthContextService;
import com.diet.common.ApiResponse;
import com.diet.dto.food.CreateFoodRequest;
import com.diet.dto.food.FoodListResponse;
import com.diet.dto.food.FoodResponse;
import com.diet.dto.food.UpdateFoodRequest;
import com.diet.service.FoodService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
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

@Tag(name = "食物管理", description = "食物创建与查询接口")
@RestController
@RequestMapping("/api/foods")
public class FoodController {

    private final FoodService foodService;

    private final AuthContextService authContextService;

    public FoodController(FoodService foodService, AuthContextService authContextService) {
        this.foodService = foodService;
        this.authContextService = authContextService;
    }

    @Operation(summary = "创建食物", description = "新增一个食物到食物库")
    @PostMapping
    public ResponseEntity<ApiResponse<FoodResponse>> create(
            @Valid @RequestBody CreateFoodRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(foodService.create(userId, request)));
    }

    @Operation(summary = "编辑自定义食物", description = "编辑当前用户的自定义食物")
    @PutMapping("/{id}")
    public ApiResponse<FoodResponse> update(
            @Parameter(description = "食物 ID") @PathVariable Long id,
            @Valid @RequestBody UpdateFoodRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(foodService.update(userId, id, request));
    }

    @Operation(summary = "删除自定义食物", description = "删除当前用户的自定义食物")
    @DeleteMapping("/{id}")
    public ApiResponse<Boolean> delete(
            @Parameter(description = "食物 ID") @PathVariable Long id,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(foodService.delete(userId, id));
    }

    @Operation(summary = "查询食物列表", description = "按关键字、分类和分页查询食物列表")
    @GetMapping
    public ApiResponse<FoodListResponse> findAll(
            @Parameter(description = "食物关键字，可为空") @RequestParam(required = false) String keyword,
            @Parameter(description = "分类筛选，支持分类 key 或中文分类名，可为空") @RequestParam(required = false) String category,
            @Parameter(description = "查询范围，ALL 为全部可见食物，CUSTOM 为仅当前用户自定义")
            @RequestParam(required = false, defaultValue = FoodService.SCOPE_ALL) String scope,
            @Parameter(description = "页码，从 1 开始") @RequestParam(required = false, defaultValue = "1") int page,
            @Parameter(description = "每页条数，默认 50，最大 100") @RequestParam(required = false, defaultValue = "50") int size,
            HttpServletRequest httpServletRequest
    ) {
        String normalizedScope = String.valueOf(scope).trim().toUpperCase();
        Long userId = FoodService.SCOPE_CUSTOM.equals(normalizedScope)
                ? authContextService.resolveUserId(httpServletRequest, null)
                : authContextService.getCurrentUserId(httpServletRequest);
        return ApiResponse.success(foodService.findAll(userId, keyword, category, page, size, normalizedScope));
    }
}
