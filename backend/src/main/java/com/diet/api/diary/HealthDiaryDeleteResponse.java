package com.diet.api.diary;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "健康日记删除响应")
public record HealthDiaryDeleteResponse(
        @Schema(description = "是否删除成功")
        boolean deleted,

        @Schema(description = "可清理的图片 fileID 列表")
        List<String> removedImageFileIds
) {
}
