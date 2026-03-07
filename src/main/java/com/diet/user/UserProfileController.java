package com.diet.user;

import com.diet.common.ApiResponse;
import com.diet.user.dto.CreateUserRequest;
import com.diet.user.dto.DailySummaryResponse;
import com.diet.user.dto.ProgressSummaryResponse;
import com.diet.user.dto.UpdateUserRequest;
import com.diet.user.dto.UserListResponse;
import com.diet.user.dto.UserResponse;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
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

@RestController
@RequestMapping("/api/users")
public class UserProfileController {

    private final UserProfileService userProfileService;

    public UserProfileController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserResponse>> create(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(userProfileService.create(request)));
    }

    @GetMapping
    public ApiResponse<UserListResponse> findAll() {
        List<UserResponse> users = userProfileService.findAll();
        return ApiResponse.success(new UserListResponse(users, users.size()));
    }

    @GetMapping("/{id}")
    public ApiResponse<UserResponse> findById(@PathVariable Long id) {
        return ApiResponse.success(userProfileService.findById(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<UserResponse> update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        return ApiResponse.success(userProfileService.update(id, request));
    }

    @GetMapping("/{id}/daily-summary")
    public ApiResponse<DailySummaryResponse> getDailySummary(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ApiResponse.success(userProfileService.getDailySummary(id, date));
    }

    @GetMapping("/{id}/progress")
    public ApiResponse<ProgressSummaryResponse> getProgress(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return ApiResponse.success(userProfileService.getProgress(id, startDate, endDate));
    }
}