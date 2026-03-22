package com.diet.common;

import java.util.List;

public record ApiErrorResponse(
        int status,
        String error,
        List<String> details
) {
}