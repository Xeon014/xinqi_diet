package com.diet.api.auth;

import com.diet.api.auth.WechatSessionResult;

public interface WechatSessionPort {

    WechatSessionResult exchangeCode(String code, String clientUserKey);
}
