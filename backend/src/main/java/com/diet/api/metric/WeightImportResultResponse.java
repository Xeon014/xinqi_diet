package com.diet.api.metric;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "体重数据导入结果")
public record WeightImportResultResponse(
        @Schema(description = "请求导入的总行数")
        int totalRequested,

        @Schema(description = "成功导入的行数")
        int imported,

        @Schema(description = "跳过的行数（已有记录且策略为 SKIP）")
        int skipped,

        @Schema(description = "覆盖的行数（已有记录且策略为 OVERWRITE）")
        int overwritten,

        @Schema(description = "错误信息列表")
        List<String> errors
) {
}
