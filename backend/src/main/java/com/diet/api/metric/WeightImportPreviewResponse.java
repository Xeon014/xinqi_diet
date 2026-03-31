package com.diet.api.metric;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "体重数据导入预览响应")
public record WeightImportPreviewResponse(
        @Schema(description = "文件名")
        String fileName,

        @Schema(description = "检测到的文件类型", example = "CSV")
        String detectedFileType,

        @Schema(description = "检测到的工作表名称，CSV 为 null")
        String detectedSheetName,

        @Schema(description = "CSV 数据行总数（不含表头）")
        int totalRows,

        @Schema(description = "成功解析的行数")
        int parsedRows,

        @Schema(description = "无法解析的行数")
        int skippedRows,

        @Schema(description = "检测到的分隔符")
        String detectedDelimiter,

        @Schema(description = "检测到的日期格式")
        String detectedDateFormat,

        @Schema(description = "检测到的单位是否为非 kg（需要转换）")
        String detectedUnit,

        @Schema(description = "预览行列表")
        List<WeightImportPreviewRow> rows
) {
}
