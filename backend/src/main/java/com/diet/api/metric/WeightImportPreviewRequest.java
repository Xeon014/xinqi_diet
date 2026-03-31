package com.diet.api.metric;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "体重数据导入预览请求")
public record WeightImportPreviewRequest(
        @NotBlank(message = "文件名不能为空")
        @Schema(description = "文件名", example = "export.csv")
        String fileName,

        @NotBlank(message = "文件内容不能为空")
        @Size(max = 2_097_152, message = "文件内容不能超过 2MB")
        @Schema(description = "CSV 文件文本内容")
        String fileContent
) {
}
