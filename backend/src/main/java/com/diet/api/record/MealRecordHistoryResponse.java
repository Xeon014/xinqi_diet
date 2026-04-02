package com.diet.api.record;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "饮食历史记录列表响应")
public record MealRecordHistoryResponse(
        @Schema(description = "历史记录")
        List<MealRecordResponse> records,

        @Schema(description = "是否还有更多数据")
        boolean hasMore,

        @Schema(description = "下一页游标记录日期")
        LocalDate nextCursorRecordDate,

        @Schema(description = "下一页游标创建时间")
        LocalDateTime nextCursorCreatedAt,

        @Schema(description = "下一页游标记录 ID")
        Long nextCursorId
) {
}
