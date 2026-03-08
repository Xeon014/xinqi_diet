package com.diet.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "微信登录请求")
public record WechatLoginRequest(
        @Schema(description = "wx.login 获取的 code")
        @NotBlank(message = "code must not be blank")
        String code,

        @Schema(description = "客户端本地用户键，便于开发环境 mock 稳定映射")
        String clientUserKey
) {
}
