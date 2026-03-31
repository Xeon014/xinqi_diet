package com.diet.api.metric;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Schema(description = "体重导入预览行")
public record WeightImportPreviewRow(
        @Schema(description = "原始日期文本")
        String rawDate,

        @Schema(description = "原始体重文本")
        String rawWeight,

        @Schema(description = "解析后的日期，解析失败为 null")
        LocalDate parsedDate,

        @Schema(description = "解析后的测量时间，解析失败为 null；仅日期数据会归一到 00:00")
        LocalDateTime parsedMeasuredAt,

        @Schema(description = "解析后的体重（kg），解析失败为 null")
        BigDecimal parsedWeightKg,

        @Schema(description = "错误信息，无错误为 null")
        String error
) {
}
