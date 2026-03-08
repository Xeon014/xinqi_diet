package com.diet.service;

import com.diet.auth.AccessTokenService;
import com.diet.auth.WechatCode2SessionClient;
import com.diet.auth.WechatSessionResult;
import com.diet.domain.user.ActivityLevel;
import com.diet.domain.user.Gender;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.auth.WechatLoginRequest;
import com.diet.dto.auth.WechatLoginResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthService {

    private static final String DEFAULT_NAME = "微信用户";

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

    public WechatLoginResponse login(WechatLoginRequest request) {
        WechatSessionResult sessionResult = wechatCode2SessionClient.exchangeCode(request.code(), request.clientUserKey());

        Optional<UserProfile> existingUser = userProfileRepository.findByOpenId(sessionResult.openId());
        boolean isNewUser = existingUser.isEmpty();

        UserProfile user = existingUser.orElseGet(() -> createDefaultUser(sessionResult.openId(), sessionResult.unionId()));
        user.setOpenId(sessionResult.openId());
        user.setUnionId(sessionResult.unionId());
        user.setLastLoginAt(LocalDateTime.now());

        if (isNewUser) {
            userProfileRepository.save(user);
        } else {
            userProfileRepository.update(user);
        }

        String accessToken = accessTokenService.generateToken(user.getId());
        return new WechatLoginResponse(accessToken, user.getId(), isNewUser);
    }

    private UserProfile createDefaultUser(String openId, String unionId) {
        UserProfile user = new UserProfile(
                DEFAULT_NAME,
                Gender.FEMALE,
                LocalDate.of(2000, 1, 1),
                new BigDecimal("165.00"),
                ActivityLevel.LIGHT,
                1800,
                new BigDecimal("60.00"),
                new BigDecimal("55.00"),
                null
        );
        user.setOpenId(openId);
        user.setUnionId(unionId);
        user.setLastLoginAt(LocalDateTime.now());
        return user;
    }
}
