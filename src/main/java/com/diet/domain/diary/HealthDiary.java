package com.diet.domain.diary;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@TableName("health_diary")
public class HealthDiary {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("user_id")
    private Long userId;

    @TableField("record_date")
    private LocalDate recordDate;

    private String content;

    @TableField("image_file_ids")
    private String imageFileIds;

    @TableField("created_at")
    private LocalDateTime createdAt;

    @TableField("updated_at")
    private LocalDateTime updatedAt;

    public HealthDiary(
            Long userId,
            LocalDate recordDate,
            String content,
            String imageFileIds
    ) {
        LocalDateTime now = LocalDateTime.now();
        this.userId = userId;
        this.recordDate = recordDate;
        this.content = content;
        this.imageFileIds = imageFileIds;
        this.createdAt = now;
        this.updatedAt = now;
    }
}
