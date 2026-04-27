package com.diet.trigger.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.diet.api.user.UserListResponse;
import com.diet.api.user.UserResponse;
import com.diet.app.user.DailySummaryQueryService;
import com.diet.app.user.ProgressQueryService;
import com.diet.app.user.UserGoalPlanApplicationService;
import com.diet.app.user.UserProfileApplicationService;
import com.diet.trigger.support.AuthContextService;
import com.diet.types.common.ApiResponse;
import com.diet.types.common.AuthConstants;
import com.diet.types.common.ConflictException;
import com.diet.types.common.UnauthorizedException;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;

@ExtendWith(MockitoExtension.class)
class UserProfileControllerTest {

    @Mock
    private UserProfileApplicationService userProfileApplicationService;

    @Mock
    private UserGoalPlanApplicationService userGoalPlanApplicationService;

    @Mock
    private DailySummaryQueryService dailySummaryQueryService;

    @Mock
    private ProgressQueryService progressQueryService;

    private UserProfileController controller;

    @BeforeEach
    void setUp() {
        controller = new UserProfileController(
                userProfileApplicationService,
                userGoalPlanApplicationService,
                dailySummaryQueryService,
                progressQueryService,
                new AuthContextService()
        );
    }

    @Test
    void findAllShouldOnlyReturnCurrentUser() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(AuthConstants.CURRENT_USER_ID_ATTR, 7L);
        UserResponse user = new UserResponse(
                7L,
                "小林",
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
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
        when(userProfileApplicationService.findById(7L)).thenReturn(user);

        ApiResponse<UserListResponse> response = controller.findAll(request);

        assertThat(response.data().total()).isEqualTo(1);
        assertThat(response.data().users()).isEqualTo(List.of(user));
        verify(userProfileApplicationService).findById(7L);
        verify(userProfileApplicationService, never()).findAll();
    }

    @Test
    void findAllShouldRejectAnonymousRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        assertThatThrownBy(() -> controller.findAll(request))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("请先登录");
    }

    @Test
    void createShouldRejectDirectCreationAfterAuthentication() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(AuthConstants.CURRENT_USER_ID_ATTR, 7L);

        assertThatThrownBy(() -> controller.create(null, request))
                .isInstanceOf(ConflictException.class)
                .hasMessage("用户资料由微信登录自动创建，请使用更新资料接口");
        verify(userProfileApplicationService, never()).create(null);
    }
}
