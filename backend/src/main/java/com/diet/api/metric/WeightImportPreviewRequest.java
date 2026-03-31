package com.diet.api.metric;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

@Schema(description = "体重数据导入预览请求")
public record WeightImportPreviewRequest(
        @Schema(description = "文件名", example = "export.csv")
        String fileName,

        @Schema(description = "CSV 文件 Base64 编码（优先，支持自动检测编码）")
        @Size(max = 4_000_000, message = "fileBase64 不能超过 4MB")
        String fileBase64,

        @Schema(description = "CSV 文件文本内容（兼容，仅支持 UTF-8）")
        @Size(max = 2_097_152, message = "fileContent 不能超过 2MB")
        String fileContent
) {
}
