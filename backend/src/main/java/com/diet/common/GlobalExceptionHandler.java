package com.diet.common;

import jakarta.validation.ConstraintViolationException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiResponse<ApiErrorResponse>> handleNotFound(NotFoundException exception) {
        return buildResponse(HttpStatus.NOT_FOUND, "NOT_FOUND", List.of(exception.getMessage()));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiResponse<ApiErrorResponse>> handleConflict(ConflictException exception) {
        return buildResponse(HttpStatus.CONFLICT, "CONFLICT", List.of(exception.getMessage()));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ApiResponse<ApiErrorResponse>> handleUnauthorized(UnauthorizedException exception) {
        return buildResponse(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", List.of(exception.getMessage()));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ApiResponse<ApiErrorResponse>> handleForbidden(ForbiddenException exception) {
        return buildResponse(HttpStatus.FORBIDDEN, "FORBIDDEN", List.of(exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<ApiErrorResponse>> handleValidation(MethodArgumentNotValidException exception) {
        List<String> details = exception.getBindingResult()
                .getAllErrors()
                .stream()
                .map(error -> error instanceof FieldError fieldError
                        ? fieldError.getField() + ": " + error.getDefaultMessage()
                        : error.getDefaultMessage())
                .toList();
        return buildResponse(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", details);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<ApiErrorResponse>> handleConstraintViolation(ConstraintViolationException exception) {
        List<String> details = exception.getConstraintViolations()
                .stream()
                .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
                .toList();
        return buildResponse(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", details);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<ApiErrorResponse>> handleIllegalArgument(IllegalArgumentException exception) {
        return buildResponse(HttpStatus.BAD_REQUEST, "BAD_REQUEST", List.of(exception.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<ApiErrorResponse>> handleUnknown(Exception exception) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", List.of(exception.getMessage()));
    }

    private ResponseEntity<ApiResponse<ApiErrorResponse>> buildResponse(HttpStatus status, String code, List<String> details) {
        ApiErrorResponse error = new ApiErrorResponse(status.value(), status.getReasonPhrase(), details);
        return ResponseEntity.status(status)
                .body(ApiResponse.failure(code, status.getReasonPhrase(), error));
    }
}
