package com.diet.service;

import com.diet.auth.AccessTokenService;
import com.diet.auth.WechatCode2SessionClient;
import com.diet.auth.WechatSessionResult;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.auth.WechatLoginRequest;
import com.diet.dto.auth.WechatLoginResponse;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthService {

    private final UserProfileRepository userProfileRepository;

    private final WechatCode2SessionClient wechatCode2SessionClient;

    private final AccessTokenService accessTokenService;

    public AuthService(
            UserProfileRepository userProfileRepository,
            WechatCode2SessionClient wechatCode2SessionClient,
            AccessTokenService accessTokenService
    ) {
        this.userProfileRepository = userProfileRepository;
        this.wechatCode2SessionClient = wechatCode2SessionClient;
        this.accessTokenService = accessTokenService;
    }

    /**
     * 云托管方式登录：直接使用 openid
     */
    public WechatLoginResponse loginByOpenId(String openId, String unionId) {
        Optional<UserProfile> existingUser = userProfileRepository.findByOpenId(openId);
        boolean isNewUser = existingUser.isEmpty();

        UserProfile user = existingUser.orElseGet(() -> createDefaultUser(openId, unionId));
        user.setOpenId(openId);
        if (unionId != null && !unionId.isBlank()) {
            user.setUnionId(unionId);
        }
        user.setLastLoginAt(LocalDateTime.now());

        if (isNewUser) {
            userProfileRepository.save(user);
        } else {
            userProfileRepository.update(user);
        }

        String accessToken = accessTokenService.generateToken(user.getId());
        return new WechatLoginResponse(accessToken, user.getId(), isNewUser);
    }

    /**
     * 传统方式登录：通过 code 换取 openid
     */
    public WechatLoginResponse login(WechatLoginRequest request) {
        WechatSessionResult sessionResult = wechatCode2SessionClient.exchangeCode(request.code(), request.clientUserKey());
        return loginByOpenId(sessionResult.openId(), sessionResult.unionId());
    }

    private UserProfile createDefaultUser(String openId, String unionId) {
        UserProfile user = new UserProfile(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
        user.setOpenId(openId);
        user.setUnionId(unionId);
        user.setLastLoginAt(LocalDateTime.now());
        return user;
    }
}
