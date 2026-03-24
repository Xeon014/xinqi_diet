package com.diet.types.common;

import java.time.LocalDateTime;

public record ApiResponse<T>(
        String code,
        String message,
        T data,
        LocalDateTime timestamp
) {

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>("SUCCESS", "ok", data, LocalDateTime.now());
    }

    public static <T> ApiResponse<T> created(T data) {
        return new ApiResponse<>("SUCCESS", "created", data, LocalDateTime.now());
    }

    public static <T> ApiResponse<T> failure(String code, String message, T data) {
        return new ApiResponse<>(code, message, data, LocalDateTime.now());
    }
}