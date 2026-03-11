package com.diet.config;

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

    public StartupConfigLogger(
            Environment environment,
            @Value("${wechat.mock-enabled:false}") boolean wechatMockEnabled
    ) {
        this.environment = environment;
        this.wechatMockEnabled = wechatMockEnabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        String[] activeProfiles = environment.getActiveProfiles();
        String profileText = activeProfiles.length == 0 ? "default" : String.join(",", activeProfiles);
        log.info("启动配置检查：activeProfiles={}, wechat.mock-enabled={}", profileText, wechatMockEnabled);
    }
}
