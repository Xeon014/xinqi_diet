package com.diet.controller;

import com.diet.common.ApiResponse;
import com.diet.dto.auth.WechatLoginRequest;
import com.diet.dto.auth.WechatLoginResponse;
import com.diet.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @Operation(summary = "微信登录", description = "通过 wx.login code 登录并自动创建用户")
    @PostMapping("/wechat/login")
    public ResponseEntity<ApiResponse<WechatLoginResponse>> login(@Valid @RequestBody WechatLoginRequest request) {
        return ResponseEntity.ok(ApiResponse.success(authService.login(request)));
    }
}
