package com.diet.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.junit.jupiter.api.Test;

class AccessTokenServiceTest {

    @Test
    void shouldGenerateAndParseUserId() {
        AccessTokenService accessTokenService = new AccessTokenService("test-secret", 30);

        String token = accessTokenService.generateToken(123L);

        assertThat(accessTokenService.parse(token).status()).isEqualTo(AccessTokenStatus.VALID);
        assertThat(accessTokenService.parseUserId(token)).contains(123L);
    }

    @Test
    void shouldRejectInvalidToken() {
        AccessTokenService accessTokenService = new AccessTokenService("test-secret", 30);

        assertThat(accessTokenService.parse("bad.token").status()).isEqualTo(AccessTokenStatus.INVALID);
        assertThat(accessTokenService.parseUserId("bad.token")).isEmpty();
    }

    @Test
    void shouldMarkMissingToken() {
        AccessTokenService accessTokenService = new AccessTokenService("test-secret", 30);

        assertThat(accessTokenService.parse("").status()).isEqualTo(AccessTokenStatus.MISSING);
    }

    @Test
    void shouldMarkExpiredToken() {
        AccessTokenService accessTokenService = new AccessTokenService("test-secret", -1);

        String encodedPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("123:1".getBytes(StandardCharsets.UTF_8));
        String token = encodedPayload + "." + sign(accessTokenService, encodedPayload);

        assertThat(accessTokenService.parse(token).status()).isEqualTo(AccessTokenStatus.EXPIRED);
    }

    private String sign(AccessTokenService accessTokenService, String payload) {
        try {
            Method signMethod = AccessTokenService.class.getDeclaredMethod("sign", String.class);
            signMethod.setAccessible(true);
            return (String) signMethod.invoke(accessTokenService, payload);
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}
