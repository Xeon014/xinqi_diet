package com.diet.types.common;

public class UnauthorizedException extends RuntimeException {

    private final String code;

    public UnauthorizedException(String message) {
        super(message);
        this.code = "UNAUTHORIZED";
    }

    public UnauthorizedException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
