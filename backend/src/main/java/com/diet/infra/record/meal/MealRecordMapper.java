package com.diet.infra.record.meal;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.diet.domain.record.MealRecord;
import com.diet.domain.record.MealType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MealRecordMapper extends BaseMapper<MealRecord> {

    List<MealRecord> findByUserWithCursor(
            @Param("userId") Long userId,
            @Param("mealType") MealType mealType,
            @Param("cursorRecordDate") LocalDate cursorRecordDate,
            @Param("cursorCreatedAt") LocalDateTime cursorCreatedAt,
            @Param("cursorId") Long cursorId,
            @Param("limit") int limit
    );
}
