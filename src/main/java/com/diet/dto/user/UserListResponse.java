package com.diet.dto.user;

import java.util.List;

public record UserListResponse(
        List<UserResponse> users,
        int total
) {
}