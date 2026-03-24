package com.diet.api.diary;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

@Schema(description = "健康日记保存请求")
public record HealthDiaryUpsertRequest(
        @Schema(description = "记录日期，格式 yyyy-MM-dd")
        @NotNull(message = "recordDate must not be null")
        LocalDate recordDate,

        @Schema(description = "日记文字，最长 500 字")
        @Size(max = 500, message = "content length must be less than or equal to 500")
        String content,

        @Schema(description = "图片 fileID 列表，最多 9 张")
        @Size(max = 9, message = "imageFileIds size must be less than or equal to 9")
        List<@NotBlank(message = "imageFileId must not be blank") String> imageFileIds
) {
}
