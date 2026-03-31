package com.diet.trigger.support;

import com.diet.types.common.ApiErrorResponse;
import com.diet.types.common.ApiResponse;
import com.diet.types.common.ConflictException;
import com.diet.types.common.ForbiddenException;
import com.diet.types.common.NotFoundException;
import com.diet.types.common.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiResponse<ApiErrorResponse>> handleNotFound(
            NotFoundException exception,
            HttpServletRequest request
    ) {
        logInfo(request, "NOT_FOUND", List.of(exception.getMessage()), exception);
        return buildResponse(HttpStatus.NOT_FOUND, "NOT_FOUND", List.of(exception.getMessage()));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiResponse<ApiErrorResponse>> handleConflict(
            ConflictException exception,
            HttpServletRequest request
    ) {
        logWarn(request, "CONFLICT", List.of(exception.getMessage()), exception);
        return buildResponse(HttpStatus.CONFLICT, "CONFLICT", List.of(exception.getMessage()));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ApiResponse<ApiErrorResponse>> handleUnauthorized(
            UnauthorizedException exception,
            HttpServletRequest request
    ) {
        logInfo(request, exception.getCode(), List.of(exception.getMessage()), exception);
        return buildResponse(HttpStatus.UNAUTHORIZED, exception.getCode(), List.of(exception.getMessage()));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ApiResponse<ApiErrorResponse>> handleForbidden(
            ForbiddenException exception,
            HttpServletRequest request
    ) {
        logWarn(request, "FORBIDDEN", List.of(exception.getMessage()), exception);
        return buildResponse(HttpStatus.FORBIDDEN, "FORBIDDEN", List.of(exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<ApiErrorResponse>> handleValidation(
            MethodArgumentNotValidException exception,
            HttpServletRequest request
    ) {
        List<String> details = exception.getBindingResult()
                .getAllErrors()
                .stream()
                .map(error -> error instanceof FieldError fieldError
                        ? fieldError.getField() + ": " + error.getDefaultMessage()
                        : error.getDefaultMessage())
                .toList();
        logWarn(request, "VALIDATION_ERROR", details, exception);
        return buildResponse(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", details);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<ApiErrorResponse>> handleConstraintViolation(
            ConstraintViolationException exception,
            HttpServletRequest request
    ) {
        List<String> details = exception.getConstraintViolations()
                .stream()
                .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
                .toList();
        logWarn(request, "VALIDATION_ERROR", details, exception);
        return buildResponse(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", details);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<ApiErrorResponse>> handleIllegalArgument(
            IllegalArgumentException exception,
            HttpServletRequest request
    ) {
        logWarn(request, "BAD_REQUEST", List.of(exception.getMessage()), exception);
        return buildResponse(HttpStatus.BAD_REQUEST, "BAD_REQUEST", List.of(exception.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<ApiErrorResponse>> handleUnknown(
            Exception exception,
            HttpServletRequest request
    ) {
        log.error("服务异常 {}", buildRequestContext(request), exception);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", List.of("系统繁忙，请稍后重试"));
    }

    private ResponseEntity<ApiResponse<ApiErrorResponse>> buildResponse(HttpStatus status, String code, List<String> details) {
        ApiErrorResponse error = new ApiErrorResponse(status.value(), status.getReasonPhrase(), details);
        return ResponseEntity.status(status)
                .body(ApiResponse.failure(code, status.getReasonPhrase(), error));
    }

    private void logInfo(HttpServletRequest request, String code, List<String> details, Exception exception) {
        log.info("请求异常 {} code={} details={}", buildRequestContext(request), code, formatDetails(details), exception);
    }

    private void logWarn(HttpServletRequest request, String code, List<String> details, Exception exception) {
        log.warn("请求异常 {} code={} details={}", buildRequestContext(request), code, formatDetails(details), exception);
    }

    private String buildRequestContext(HttpServletRequest request) {
        if (request == null) {
            return "[unknown]";
        }
        String method = Objects.toString(request.getMethod(), "UNKNOWN");
        String path = Objects.toString(request.getRequestURI(), "");
        String query = request.getQueryString();
        Object userId = request.getAttribute(com.diet.types.common.AuthConstants.CURRENT_USER_ID_ATTR);
        String requestPath = query == null || query.isBlank() ? path : path + "?" + query;
        return "[method=" + method + ", path=" + requestPath + ", userId=" + Objects.toString(userId, "-") + "]";
    }

    private String formatDetails(List<String> details) {
        if (details == null || details.isEmpty()) {
            return "[]";
        }
        return details.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(detail -> !detail.isEmpty())
                .toList()
                .toString();
    }
}
