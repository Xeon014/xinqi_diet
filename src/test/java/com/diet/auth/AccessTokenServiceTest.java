package com.diet.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AccessTokenServiceTest {

    @Test
    void shouldGenerateAndParseUserId() {
        AccessTokenService accessTokenService = new AccessTokenService("test-secret", 30);

        String token = accessTokenService.generateToken(123L);

        assertThat(accessTokenService.parseUserId(token)).contains(123L);
    }

    @Test
    void shouldRejectInvalidToken() {
        AccessTokenService accessTokenService = new AccessTokenService("test-secret", 30);

        assertThat(accessTokenService.parseUserId("bad.token")).isEmpty();
    }
}
