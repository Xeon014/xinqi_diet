package com.diet.auth;

import com.diet.common.ForbiddenException;
import com.diet.common.UnauthorizedException;
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
            throw new UnauthorizedException("missing or invalid access token");
        }
        return userId;
    }

    public Long resolveUserId(HttpServletRequest request, Long requestedUserId) {
        Long currentUserId = getCurrentUserId(request);
        if (currentUserId == null) {
            if (requestedUserId == null) {
                throw new UnauthorizedException("missing user id");
            }
            return requestedUserId;
        }

        if (requestedUserId != null && !currentUserId.equals(requestedUserId)) {
            throw new ForbiddenException("user id mismatch");
        }
        return currentUserId;
    }
}
