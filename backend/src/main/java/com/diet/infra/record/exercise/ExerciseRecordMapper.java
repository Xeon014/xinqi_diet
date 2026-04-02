package com.diet.infra.record.exercise;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.diet.domain.exercise.ExerciseRecord;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ExerciseRecordMapper extends BaseMapper<ExerciseRecord> {

    List<ExerciseRecord> findByUserWithCursor(
            @Param("userId") Long userId,
            @Param("cursorRecordDate") LocalDate cursorRecordDate,
            @Param("cursorCreatedAt") LocalDateTime cursorCreatedAt,
            @Param("cursorId") Long cursorId,
            @Param("limit") int limit
    );
}
