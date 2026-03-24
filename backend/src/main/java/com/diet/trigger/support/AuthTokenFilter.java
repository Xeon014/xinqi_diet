package com.diet.trigger.support;

import com.diet.api.auth.AccessTokenPort;
import com.diet.api.auth.AccessTokenParseResult;
import com.diet.types.common.AuthConstants;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class AuthTokenFilter extends OncePerRequestFilter {

    private final AccessTokenPort accessTokenPort;

    public AuthTokenFilter(AccessTokenPort accessTokenPort) {
        this.accessTokenPort = accessTokenPort;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring("Bearer ".length()).trim();
            AccessTokenParseResult result = accessTokenPort.parse(token);
            if (result.isValid()) {
                request.setAttribute(AuthConstants.CURRENT_USER_ID_ATTR, result.userId());
            } else {
                request.setAttribute(AuthConstants.ACCESS_TOKEN_STATUS_ATTR, result.status());
            }
        }
        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }
}
