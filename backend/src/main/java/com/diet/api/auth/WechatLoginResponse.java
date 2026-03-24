package com.diet.api.auth;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "微信登录响应")
public record WechatLoginResponse(
        @Schema(description = "业务访问令牌")
        String accessToken,

        @Schema(description = "用户 ID")
        Long userId,

        @Schema(description = "是否首次创建用户")
        boolean isNewUser
) {
}
