package com.diet.food;

import com.diet.common.ApiResponse;
import com.diet.food.dto.CreateFoodRequest;
import com.diet.food.dto.FoodListResponse;
import com.diet.food.dto.FoodResponse;
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

@RestController
@RequestMapping("/api/foods")
public class FoodController {

    private final FoodService foodService;

    public FoodController(FoodService foodService) {
        this.foodService = foodService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<FoodResponse>> create(@Valid @RequestBody CreateFoodRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(foodService.create(request)));
    }

    @GetMapping
    public ApiResponse<FoodListResponse> findAll(@RequestParam(required = false) String keyword) {
        List<FoodResponse> foods = foodService.findAll(keyword);
        return ApiResponse.success(new FoodListResponse(foods, foods.size()));
    }
}