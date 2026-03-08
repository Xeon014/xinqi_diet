package com.diet.auth;

public record WechatSessionResult(
        String openId,
        String unionId,
        String sessionKey
) {
}
