package com.diet.controller;

import com.diet.common.ApiResponse;
import com.diet.dto.food.CreateFoodRequest;
import com.diet.dto.food.FoodListResponse;
import com.diet.dto.food.FoodResponse;
import com.diet.service.FoodService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "食物管理", description = "食物创建与查询接口")
@RestController
@RequestMapping("/api/foods")
public class FoodController {

    private final FoodService foodService;

    public FoodController(FoodService foodService) {
        this.foodService = foodService;
    }

    @Operation(summary = "创建食物", description = "新增一个食物到食物库")
    @PostMapping
    public ResponseEntity<ApiResponse<FoodResponse>> create(@Valid @RequestBody CreateFoodRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(foodService.create(request)));
    }

    @Operation(summary = "查询食物列表", description = "按关键字模糊查询食物列表")
    @GetMapping
    public ApiResponse<FoodListResponse> findAll(
            @Parameter(description = "食物关键字，可为空") @RequestParam(required = false) String keyword
    ) {
        List<FoodResponse> foods = foodService.findAll(keyword);
        return ApiResponse.success(new FoodListResponse(foods, foods.size()));
    }
}