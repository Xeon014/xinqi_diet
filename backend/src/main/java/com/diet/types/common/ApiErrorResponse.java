package com.diet.types.common;

import java.util.List;

public record ApiErrorResponse(
        int status,
        String error,
        List<String> details
) {
}