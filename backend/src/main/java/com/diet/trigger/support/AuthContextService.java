package com.diet.trigger.support;

import com.diet.api.auth.AccessTokenStatus;
import com.diet.types.common.AuthConstants;
import com.diet.types.common.ForbiddenException;
import com.diet.types.common.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

@Component
public class AuthContextService {

    public Long getCurrentUserId(HttpServletRequest request) {
        Object value = request.getAttribute(AuthConstants.CURRENT_USER_ID_ATTR);
        if (value instanceof Long userId) {
            return userId;
        }
        return null;
    }

    public Long requireCurrentUserId(HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        if (userId == null) {
            throw buildUnauthorizedException(request);
        }
        return userId;
    }

    public Long resolveUserId(HttpServletRequest request, Long requestedUserId) {
        Long currentUserId = getCurrentUserId(request);
        if (currentUserId == null) {
            throw buildUnauthorizedException(request);
        }

        if (requestedUserId != null && !currentUserId.equals(requestedUserId)) {
            throw new ForbiddenException("user id mismatch");
        }
        return currentUserId;
    }

    private UnauthorizedException buildUnauthorizedException(HttpServletRequest request) {
        Object statusValue = request.getAttribute(AuthConstants.ACCESS_TOKEN_STATUS_ATTR);
        if (statusValue == AccessTokenStatus.EXPIRED) {
            return new UnauthorizedException("TOKEN_EXPIRED", "登录状态已过期，请重新登录");
        }
        if (statusValue == AccessTokenStatus.INVALID) {
            return new UnauthorizedException("TOKEN_INVALID", "登录状态无效，请重新登录");
        }
        return new UnauthorizedException("TOKEN_MISSING", "请先登录");
    }
}
