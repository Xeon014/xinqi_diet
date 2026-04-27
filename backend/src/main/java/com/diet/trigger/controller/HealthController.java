package com.diet.trigger.controller;

import com.diet.types.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.sql.Connection;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "健康检查", description = "服务健康检查接口")
@RestController
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Operation(summary = "服务存活检查", description = "用于云托管健康探测")
    @GetMapping("/api/ping")
    public ResponseEntity<ApiResponse<String>> ping() {
        return ResponseEntity.ok(ApiResponse.success("pong"));
    }

    @Operation(summary = "服务就绪检查", description = "用于发布后确认数据库连接可用")
    @GetMapping({"/readyz", "/api/readyz"})
    public ResponseEntity<ApiResponse<Map<String, Object>>> readyz() {
        try (Connection connection = dataSource.getConnection()) {
            boolean databaseReady = connection.isValid(2);
            Map<String, Object> result = Map.of(
                    "status", databaseReady ? "UP" : "DOWN",
                    "database", databaseReady ? "UP" : "DOWN"
            );
            return ResponseEntity
                    .status(databaseReady ? 200 : 503)
                    .body(ApiResponse.success(result));
        } catch (Exception exception) {
            Map<String, Object> result = Map.of(
                    "status", "DOWN",
                    "database", "DOWN"
            );
            return ResponseEntity.status(503).body(ApiResponse.success(result));
        }
    }
}
