package com.diet.trigger.controller;

import com.diet.types.common.ApiResponse;
import com.diet.api.auth.WechatLoginRequest;
import com.diet.api.auth.WechatLoginResponse;
import com.diet.app.auth.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "认证", description = "微信登录认证接口")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String HEADER_WX_OPENID = "x-wx-openid";
    private static final String HEADER_WX_UNIONID = "x-wx-unionid";

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @Operation(summary = "微信登录", description = "云托管方式从 header 获取 openid，传统方式通过 code 换取")
    @PostMapping("/wechat/login")
    public ResponseEntity<ApiResponse<WechatLoginResponse>> login(
            @Valid @RequestBody WechatLoginRequest request,
            HttpServletRequest httpRequest) {
        // 优先从云托管 header 获取 openid
        String openId = httpRequest.getHeader(HEADER_WX_OPENID);
        String unionId = httpRequest.getHeader(HEADER_WX_UNIONID);

        WechatLoginResponse response;
        if (openId != null && !openId.isBlank()) {
            // 云托管方式：直接用 header 中的 openid 登录
            response = authService.loginByOpenId(openId, unionId);
        } else {
            // 传统方式：通过 code 换取 openid
            response = authService.login(request);
        }

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
