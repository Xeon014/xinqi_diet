package com.diet.trigger.controller;

import com.diet.trigger.support.AuthContextService;
import com.diet.types.common.ApiResponse;
import com.diet.api.combo.CreateMealComboRequest;
import com.diet.api.combo.MealComboListResponse;
import com.diet.api.combo.MealComboResponse;
import com.diet.api.combo.UpdateMealComboRequest;
import com.diet.app.combo.MealComboService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
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

@Tag(name = "饮食套餐", description = "用户自定义套餐管理接口")
@RestController
@RequestMapping("/api/meal-combos")
public class MealComboController {

    private final MealComboService mealComboService;

    private final AuthContextService authContextService;

    public MealComboController(MealComboService mealComboService, AuthContextService authContextService) {
        this.mealComboService = mealComboService;
        this.authContextService = authContextService;
    }

    @Operation(summary = "创建套餐", description = "创建用户自定义食物套餐")
    @PostMapping
    public ResponseEntity<ApiResponse<MealComboResponse>> create(
            @Valid @RequestBody CreateMealComboRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Long userId = authContextService.requireCurrentUserId(httpServletRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(mealComboService.create(userId, request)));
    }

    @Operation(summary = "编辑套餐", description = "编辑套餐名称和食物明细")
    @PutMapping("/{id}")
    public ApiResponse<MealComboResponse> update(
            @Parameter(description = "套餐 ID") @PathVariable Long id,
            @Valid @RequestBody UpdateMealComboRequest request,
            HttpServletRequest httpServletRequest
    ) {
        Long resolvedUserId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(mealComboService.update(resolvedUserId, id, request));
    }

    @Operation(summary = "删除套餐", description = "删除当前用户的自定义套餐")
    @DeleteMapping("/{id}")
    public ApiResponse<Boolean> delete(
            @Parameter(description = "套餐 ID") @PathVariable Long id,
            HttpServletRequest httpServletRequest
    ) {
        Long resolvedUserId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(mealComboService.delete(resolvedUserId, id));
    }

    @Operation(summary = "查询套餐列表", description = "查询当前用户可用的套餐列表")
    @GetMapping
    public ApiResponse<MealComboListResponse> findAll(
            HttpServletRequest httpServletRequest
    ) {
        Long resolvedUserId = authContextService.requireCurrentUserId(httpServletRequest);
        List<MealComboResponse> combos = mealComboService.findByUser(resolvedUserId);
        return ApiResponse.success(new MealComboListResponse(combos, combos.size()));
    }

    @Operation(summary = "查询套餐详情", description = "查询套餐明细并返回食物营养信息")
    @GetMapping("/{id}")
    public ApiResponse<MealComboResponse> findById(
            @Parameter(description = "套餐 ID") @PathVariable Long id,
            HttpServletRequest httpServletRequest
    ) {
        Long resolvedUserId = authContextService.requireCurrentUserId(httpServletRequest);
        return ApiResponse.success(mealComboService.findById(resolvedUserId, id));
    }
}
