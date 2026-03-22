package com.diet.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.diet.auth.AccessTokenService;
import com.diet.auth.WechatCode2SessionClient;
import com.diet.auth.WechatSessionResult;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.auth.WechatLoginRequest;
import com.diet.dto.auth.WechatLoginResponse;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private WechatCode2SessionClient wechatCode2SessionClient;

    @Mock
    private AccessTokenService accessTokenService;

    @InjectMocks
    private AuthService authService;

    @Test
    void shouldCreateUserForFirstLogin() {
        when(wechatCode2SessionClient.exchangeCode("wx-code", "client-key"))
                .thenReturn(new WechatSessionResult("openid-1", "union-1", "session-1"));
        when(userProfileRepository.findByOpenId("openid-1")).thenReturn(Optional.empty());
        doAnswer(invocation -> {
            UserProfile profile = invocation.getArgument(0);
            profile.setId(100L);
            return null;
        }).when(userProfileRepository).save(any(UserProfile.class));
        when(accessTokenService.generateToken(100L)).thenReturn("token-100");

        WechatLoginResponse response = authService.login(new WechatLoginRequest("wx-code", "client-key"));

        assertThat(response.userId()).isEqualTo(100L);
        assertThat(response.accessToken()).isEqualTo("token-100");
        assertThat(response.isNewUser()).isTrue();
        verify(userProfileRepository).save(any(UserProfile.class));
    }

    @Test
    void shouldReturnExistingUserForRelogin() {
        UserProfile existing = new UserProfile();
        existing.setId(200L);
        existing.setOpenId("openid-2");

        when(wechatCode2SessionClient.exchangeCode("wx-code", "client-key"))
                .thenReturn(new WechatSessionResult("openid-2", "union-2", "session-2"));
        when(userProfileRepository.findByOpenId("openid-2")).thenReturn(Optional.of(existing));
        when(accessTokenService.generateToken(200L)).thenReturn("token-200");

        WechatLoginResponse response = authService.login(new WechatLoginRequest("wx-code", "client-key"));

        assertThat(response.userId()).isEqualTo(200L);
        assertThat(response.accessToken()).isEqualTo("token-200");
        assertThat(response.isNewUser()).isFalse();
        verify(userProfileRepository).update(existing);
    }
}
