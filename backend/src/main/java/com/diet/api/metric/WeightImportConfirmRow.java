package com.diet.api.metric;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

@Schema(description = "体重导入确认行")
public record WeightImportConfirmRow(
        @NotNull(message = "导入日期不能为空")
        @Schema(description = "记录日期", example = "2025-01-01")
        LocalDate date,

        @NotNull(message = "体重不能为空")
        @DecimalMin(value = "20.0", message = "体重不能低于 20.0 kg")
        @DecimalMax(value = "300.0", message = "体重不能高于 300.0 kg")
        @Schema(description = "体重（kg）", example = "65.5")
        BigDecimal weightKg
) {
}
