package com.diet.dto.diary;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "健康日记详情")
public record HealthDiaryResponse(
        @Schema(description = "日记 ID")
        Long id,

        @Schema(description = "用户 ID")
        Long userId,

        @Schema(description = "记录日期")
        LocalDate recordDate,

        @Schema(description = "日记文字")
        String content,

        @Schema(description = "图片 fileID 列表")
        List<String> imageFileIds,

        @Schema(description = "创建时间")
        LocalDateTime createdAt,

        @Schema(description = "更新时间")
        LocalDateTime updatedAt
) {
}
