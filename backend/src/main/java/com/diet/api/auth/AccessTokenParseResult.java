package com.diet.api.auth;

public record AccessTokenParseResult(
        AccessTokenStatus status,
        Long userId
) {

    public static AccessTokenParseResult valid(Long userId) {
        return new AccessTokenParseResult(AccessTokenStatus.VALID, userId);
    }

    public static AccessTokenParseResult missing() {
        return new AccessTokenParseResult(AccessTokenStatus.MISSING, null);
    }

    public static AccessTokenParseResult invalid() {
        return new AccessTokenParseResult(AccessTokenStatus.INVALID, null);
    }

    public static AccessTokenParseResult expired() {
        return new AccessTokenParseResult(AccessTokenStatus.EXPIRED, null);
    }

    public boolean isValid() {
        return status == AccessTokenStatus.VALID && userId != null;
    }
}
