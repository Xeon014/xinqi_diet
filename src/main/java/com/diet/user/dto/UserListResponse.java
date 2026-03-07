package com.diet.user.dto;

import java.util.List;

public record UserListResponse(
        List<UserResponse> users,
        int total
) {
}