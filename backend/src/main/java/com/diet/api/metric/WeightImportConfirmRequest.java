package com.diet.api.metric;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

@Schema(description = "体重数据导入确认请求")
public record WeightImportConfirmRequest(
        @NotEmpty(message = "待导入数据不能为空")
        @Size(max = 1000, message = "单次最多导入 1000 行")
        @Schema(description = "待导入的行数据")
        List<@Valid WeightImportConfirmRow> rows,

        @NotNull(message = "请选择重复记录处理策略")
        @Schema(description = "重复记录处理策略")
        DuplicatePolicy duplicatePolicy
) {
}
