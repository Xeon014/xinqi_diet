package com.diet.app.auth;

import com.diet.api.auth.AccessTokenPort;
import com.diet.api.auth.WechatSessionPort;
import com.diet.api.auth.WechatSessionResult;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.api.auth.WechatLoginRequest;
import com.diet.api.auth.WechatLoginResponse;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthService {

    private final UserProfileRepository userProfileRepository;

    private final WechatSessionPort wechatSessionPort;

    private final AccessTokenPort accessTokenPort;

    public AuthService(
            UserProfileRepository userProfileRepository,
            WechatSessionPort wechatSessionPort,
            AccessTokenPort accessTokenPort
    ) {
        this.userProfileRepository = userProfileRepository;
        this.wechatSessionPort = wechatSessionPort;
        this.accessTokenPort = accessTokenPort;
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

        String accessToken = accessTokenPort.generateToken(user.getId());
        return new WechatLoginResponse(accessToken, user.getId(), isNewUser);
    }

    /**
     * 传统方式登录：通过 code 换取 openid
     */
    public WechatLoginResponse login(WechatLoginRequest request) {
        WechatSessionResult sessionResult = wechatSessionPort.exchangeCode(request.code(), request.clientUserKey());
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
