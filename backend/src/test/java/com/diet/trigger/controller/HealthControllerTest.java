package com.diet.trigger.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.diet.types.common.ApiResponse;
import java.sql.Connection;
import java.util.Map;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class HealthControllerTest {

    @Test
    void readyzShouldReturnUpWhenDatabaseConnectionIsValid() throws Exception {
        DataSource dataSource = org.mockito.Mockito.mock(DataSource.class);
        Connection connection = org.mockito.Mockito.mock(Connection.class);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(2)).thenReturn(true);

        HealthController controller = new HealthController(dataSource);

        ResponseEntity<ApiResponse<Map<String, Object>>> response = controller.readyz();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().data()).containsEntry("status", "UP");
        assertThat(response.getBody().data()).containsEntry("database", "UP");
    }

    @Test
    void readyzShouldReturnServiceUnavailableWhenDatabaseConnectionFails() throws Exception {
        DataSource dataSource = org.mockito.Mockito.mock(DataSource.class);
        when(dataSource.getConnection()).thenThrow(new IllegalStateException("database unavailable"));

        HealthController controller = new HealthController(dataSource);

        ResponseEntity<ApiResponse<Map<String, Object>>> response = controller.readyz();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().data()).containsEntry("status", "DOWN");
        assertThat(response.getBody().data()).containsEntry("database", "DOWN");
    }
}
