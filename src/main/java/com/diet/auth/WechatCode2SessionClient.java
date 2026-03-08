package com.diet.auth;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class WechatCode2SessionClient {

    private final RestClient restClient;

    private final String appId;

    private final String appSecret;

    private final boolean mockEnabled;

    public WechatCode2SessionClient(
            @Value("${wechat.app-id:}") String appId,
            @Value("${wechat.app-secret:}") String appSecret,
            @Value("${wechat.mock-enabled:false}") boolean mockEnabled
    ) {
        this.restClient = RestClient.builder().build();
        this.appId = appId;
        this.appSecret = appSecret;
        this.mockEnabled = mockEnabled;
    }

    @SuppressWarnings("unchecked")
    public WechatSessionResult exchangeCode(String code, String clientUserKey) {
        if (mockEnabled) {
            String openId = (clientUserKey == null || clientUserKey.isBlank())
                    ? "mock_openid_" + code
                    : "mock_openid_" + clientUserKey;
            return new WechatSessionResult(openId, null, null);
        }

        if (appId == null || appId.isBlank() || appSecret == null || appSecret.isBlank()) {
            throw new IllegalStateException("wechat app id/secret is not configured");
        }

        Map<String, Object> response = restClient.get()
                .uri(
                        "https://api.weixin.qq.com/sns/jscode2session?appid={appid}&secret={secret}&js_code={code}&grant_type=authorization_code",
                        appId,
                        appSecret,
                        code
                )
                .retrieve()
                .body(Map.class);

        if (response == null) {
            throw new IllegalArgumentException("wechat login failed: empty response");
        }

        Object errorCode = response.get("errcode");
        if (errorCode != null) {
            throw new IllegalArgumentException("wechat login failed: " + response.get("errmsg"));
        }

        String openId = (String) response.get("openid");
        if (openId == null || openId.isBlank()) {
            throw new IllegalArgumentException("wechat login failed: openid is empty");
        }

        return new WechatSessionResult(
                openId,
                (String) response.get("unionid"),
                (String) response.get("session_key")
        );
    }
}
