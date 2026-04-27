package com.diet.infra.config;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class StartupConfigLoggerTest {

    @Test
    void shouldAllowDevProfileWithMockAndDevSecret() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("dev");
        StartupConfigLogger logger = new StartupConfigLogger(
                environment,
                true,
                "diet-dev-secret-change-me"
        );

        assertThatCode(() -> logger.run(null)).doesNotThrowAnyException();
    }

    @Test
    void shouldRejectWechatMockInProd() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        StartupConfigLogger logger = new StartupConfigLogger(
                environment,
                true,
                "01234567890123456789012345678901"
        );

        assertThatThrownBy(() -> logger.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("生产环境禁止开启 wechat.mock-enabled");
    }

    @Test
    void shouldRejectWeakTokenSecretInProd() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        StartupConfigLogger logger = new StartupConfigLogger(
                environment,
                false,
                "short-secret"
        );

        assertThatThrownBy(() -> logger.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("生产环境 AUTH_TOKEN_SECRET 必须使用 32 位以上高强度随机密钥");
    }
}
