package com.diet.api.diary;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "健康日记保存响应")
public record HealthDiaryUpsertResponse(
        @Schema(description = "日记详情")
        HealthDiaryResponse diary,

        @Schema(description = "本次更新后可清理的旧图片 fileID")
        List<String> removedImageFileIds
) {
}
