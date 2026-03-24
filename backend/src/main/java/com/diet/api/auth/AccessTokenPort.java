package com.diet.api.auth;

import com.diet.api.auth.AccessTokenParseResult;
import java.util.Optional;

public interface AccessTokenPort {

    String generateToken(Long userId);

    AccessTokenParseResult parse(String token);

    Optional<Long> parseUserId(String token);
}
