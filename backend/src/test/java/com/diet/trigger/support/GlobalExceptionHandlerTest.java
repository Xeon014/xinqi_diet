package com.diet.trigger.support;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.diet.types.common.ApiErrorResponse;
import com.diet.types.common.ApiResponse;
import com.diet.types.common.AuthConstants;
import com.diet.types.common.NotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

class GlobalExceptionHandlerTest {

    private final Logger logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private ListAppender<ILoggingEvent> appender;

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        logger.detachAppender(appender);
    }

    @Test
    void shouldLogInfoForNotFound() {
        MockHttpServletRequest request = buildRequest("GET", "/api/body-metrics/history", "metricKey=WEIGHT", 123L);

        ResponseEntity<ApiResponse<ApiErrorResponse>> response =
                handler.handleNotFound(new NotFoundException("记录不存在"), request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("NOT_FOUND");
        assertThat(appender.list).hasSize(1);
        assertThat(appender.list.get(0).getLevel()).isEqualTo(Level.INFO);
        assertThat(appender.list.get(0).getFormattedMessage())
                .contains("code=NOT_FOUND")
                .contains("method=GET")
                .contains("path=/api/body-metrics/history?metricKey=WEIGHT")
                .contains("userId=123")
                .contains("记录不存在");
        assertThat(appender.list.get(0).getThrowableProxy()).isNotNull();
        assertThat(appender.list.get(0).getThrowableProxy().getMessage()).isEqualTo("记录不存在");
    }

    @Test
    void shouldLogWarnForIllegalArgument() {
        MockHttpServletRequest request = buildRequest("POST", "/api/body-metrics/import/preview", null, 456L);

        ResponseEntity<ApiResponse<ApiErrorResponse>> response =
                handler.handleIllegalArgument(new IllegalArgumentException("未找到日期列"), request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("BAD_REQUEST");
        assertThat(appender.list).hasSize(1);
        assertThat(appender.list.get(0).getLevel()).isEqualTo(Level.WARN);
        assertThat(appender.list.get(0).getFormattedMessage())
                .contains("code=BAD_REQUEST")
                .contains("method=POST")
                .contains("path=/api/body-metrics/import/preview")
                .contains("userId=456")
                .contains("未找到日期列");
        assertThat(appender.list.get(0).getThrowableProxy()).isNotNull();
        assertThat(appender.list.get(0).getThrowableProxy().getMessage()).isEqualTo("未找到日期列");
    }

    @Test
    void shouldLogErrorForUnknownExceptionWithStackTrace() {
        MockHttpServletRequest request = buildRequest("POST", "/api/body-metrics/import/confirm", null, null);
        RuntimeException exception = new RuntimeException("boom");

        ResponseEntity<ApiResponse<ApiErrorResponse>> response = handler.handleUnknown(exception, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("INTERNAL_SERVER_ERROR");
        assertThat(appender.list).hasSize(1);
        assertThat(appender.list.get(0).getLevel()).isEqualTo(Level.ERROR);
        assertThat(appender.list.get(0).getFormattedMessage())
                .contains("method=POST")
                .contains("path=/api/body-metrics/import/confirm")
                .contains("userId=-");
        assertThat(appender.list.get(0).getThrowableProxy()).isNotNull();
        assertThat(appender.list.get(0).getThrowableProxy().getMessage()).isEqualTo("boom");
    }

    private MockHttpServletRequest buildRequest(String method, String path, String query, Long userId) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.setQueryString(query);
        if (userId != null) {
            request.setAttribute(AuthConstants.CURRENT_USER_ID_ATTR, userId);
        }
        return request;
    }
}
