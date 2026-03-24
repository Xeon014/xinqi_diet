package com.diet.infra.auth;

import com.diet.api.auth.AccessTokenPort;
import com.diet.api.auth.AccessTokenParseResult;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AccessTokenService implements AccessTokenPort {

    private static final String HMAC_SHA_256 = "HmacSHA256";

    private final byte[] secretKey;

    private final long tokenExpireSeconds;

    public AccessTokenService(
            @Value("${auth.token-secret:diet-dev-secret-change-me}") String tokenSecret,
            @Value("${auth.token-expire-days:30}") long tokenExpireDays
    ) {
        this.secretKey = tokenSecret.getBytes(StandardCharsets.UTF_8);
        this.tokenExpireSeconds = Math.max(tokenExpireDays, 1) * 24L * 60L * 60L;
    }

    public String generateToken(Long userId) {
        long expiresAt = Instant.now().getEpochSecond() + tokenExpireSeconds;
        String payload = userId + ":" + expiresAt;
        String encodedPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        String signature = sign(encodedPayload);
        return encodedPayload + "." + signature;
    }

    public AccessTokenParseResult parse(String token) {
        if (token == null || token.isBlank()) {
            return AccessTokenParseResult.missing();
        }

        String[] parts = token.split("\\.");
        if (parts.length != 2) {
            return AccessTokenParseResult.invalid();
        }

        String encodedPayload = parts[0];
        String signature = parts[1];
        String expectedSignature = sign(encodedPayload);
        if (!MessageDigest.isEqual(signature.getBytes(StandardCharsets.UTF_8), expectedSignature.getBytes(StandardCharsets.UTF_8))) {
            return AccessTokenParseResult.invalid();
        }

        String payload;
        try {
            payload = new String(Base64.getUrlDecoder().decode(encodedPayload), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException exception) {
            return AccessTokenParseResult.invalid();
        }

        String[] payloadParts = payload.split(":");
        if (payloadParts.length != 2) {
            return AccessTokenParseResult.invalid();
        }

        try {
            long userId = Long.parseLong(payloadParts[0]);
            long expiresAt = Long.parseLong(payloadParts[1]);
            if (expiresAt < Instant.now().getEpochSecond()) {
                return AccessTokenParseResult.expired();
            }
            return AccessTokenParseResult.valid(userId);
        } catch (NumberFormatException exception) {
            return AccessTokenParseResult.invalid();
        }
    }

    public Optional<Long> parseUserId(String token) {
        AccessTokenParseResult result = parse(token);
        return result.isValid() ? Optional.of(result.userId()) : Optional.empty();
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA_256);
            mac.init(new SecretKeySpec(secretKey, HMAC_SHA_256));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (Exception exception) {
            throw new IllegalStateException("failed to sign access token", exception);
        }
    }
}
