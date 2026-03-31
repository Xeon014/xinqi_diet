package com.diet.api.metric;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Schema(description = "体重导入确认行")
public record WeightImportConfirmRow(
        @NotNull(message = "导入时间不能为空")
        @Schema(description = "记录时间，精确到分钟", example = "2025-01-01T07:35:00")
        LocalDateTime measuredAt,

        @NotNull(message = "体重不能为空")
        @DecimalMin(value = "20.0", message = "体重不能低于 20.0 kg")
        @DecimalMax(value = "300.0", message = "体重不能高于 300.0 kg")
        @Schema(description = "体重（kg）", example = "65.5")
        BigDecimal weightKg
) {
}
