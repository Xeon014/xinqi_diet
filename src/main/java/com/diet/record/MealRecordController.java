package com.diet.record;

import com.diet.common.ApiResponse;
import com.diet.record.dto.CreateMealRecordRequest;
import com.diet.record.dto.MealRecordListResponse;
import com.diet.record.dto.MealRecordResponse;
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

@RestController
@RequestMapping("/api/records")
public class MealRecordController {

    private final MealRecordService mealRecordService;

    public MealRecordController(MealRecordService mealRecordService) {
        this.mealRecordService = mealRecordService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MealRecordResponse>> create(@Valid @RequestBody CreateMealRecordRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(mealRecordService.create(request)));
    }

    @GetMapping
    public ApiResponse<MealRecordListResponse> findByUserAndDate(
            @RequestParam Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        List<MealRecordResponse> records = mealRecordService.findByUserAndDate(userId, date);
        return ApiResponse.success(new MealRecordListResponse(userId, date, records, records.size()));
    }
}