package com.diet.api.auth;

public record WechatSessionResult(
        String openId,
        String unionId,
        String sessionKey
) {
}
