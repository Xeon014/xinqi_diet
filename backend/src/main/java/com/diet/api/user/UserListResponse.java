package com.diet.api.user;

import java.util.List;

public record UserListResponse(
        List<UserResponse> users,
        int total
) {
}