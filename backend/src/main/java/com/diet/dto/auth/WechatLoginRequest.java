package com.diet.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "微信登录请求")
public record WechatLoginRequest(
        @Schema(description = "wx.login 获取的 code（云托管方式可不传）")
        String code,

        @Schema(description = "客户端本地用户键，便于开发环境 mock 稳定映射")
        String clientUserKey
) {}
