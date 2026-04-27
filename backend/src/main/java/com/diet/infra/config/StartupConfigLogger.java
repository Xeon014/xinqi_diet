package com.diet.infra.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class StartupConfigLogger implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(StartupConfigLogger.class);

    private final Environment environment;

    private final boolean wechatMockEnabled;

    private final String authTokenSecret;

    public StartupConfigLogger(
            Environment environment,
            @Value("${wechat.mock-enabled:false}") boolean wechatMockEnabled,
            @Value("${auth.token-secret:}") String authTokenSecret
    ) {
        this.environment = environment;
        this.wechatMockEnabled = wechatMockEnabled;
        this.authTokenSecret = authTokenSecret;
    }

    @Override
    public void run(ApplicationArguments args) {
        String[] activeProfiles = environment.getActiveProfiles();
        String profileText = activeProfiles.length == 0 ? "default" : String.join(",", activeProfiles);
        validateProductionConfig(activeProfiles);
        log.info("启动配置检查：activeProfiles={}, wechat.mock-enabled={}", profileText, wechatMockEnabled);
    }

    private void validateProductionConfig(String[] activeProfiles) {
        if (!isProd(activeProfiles)) {
            return;
        }
        if (wechatMockEnabled) {
            throw new IllegalStateException("生产环境禁止开启 wechat.mock-enabled");
        }
        if (authTokenSecret == null
                || authTokenSecret.isBlank()
                || authTokenSecret.length() < 32
                || "diet-dev-secret-change-me".equals(authTokenSecret)) {
            throw new IllegalStateException("生产环境 AUTH_TOKEN_SECRET 必须使用 32 位以上高强度随机密钥");
        }
    }

    private boolean isProd(String[] activeProfiles) {
        for (String activeProfile : activeProfiles) {
            if ("prod".equals(activeProfile)) {
                return true;
            }
        }
        return false;
    }
}
