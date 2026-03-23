package com.diet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.diet.domain.metric.BodyMetricRecord;
import com.diet.domain.metric.BodyMetricType;
import java.time.LocalDate;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface BodyMetricRecordMapper extends BaseMapper<BodyMetricRecord> {

    BodyMetricRecord findLatestByMetricType(
            @Param("userId") Long userId,
            @Param("metricType") BodyMetricType metricType
    );

    List<BodyMetricRecord> findDailyLatestByDate(
            @Param("userId") Long userId,
            @Param("date") LocalDate date
    );

    List<BodyMetricRecord> findDailyLatestByMetricTypeAndDateRange(
            @Param("userId") Long userId,
            @Param("metricType") BodyMetricType metricType,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    List<BodyMetricRecord> findDailyLatestByMetricTypeWithCursor(
            @Param("userId") Long userId,
            @Param("metricType") BodyMetricType metricType,
            @Param("cursorDate") LocalDate cursorDate,
            @Param("cursorId") Long cursorId,
            @Param("limit") int limit
    );

    List<BodyMetricRecord> findByMetricTypeWithCursor(
            @Param("userId") Long userId,
            @Param("metricType") BodyMetricType metricType,
            @Param("cursorDate") LocalDate cursorDate,
            @Param("cursorId") Long cursorId,
            @Param("limit") int limit
    );

    BodyMetricRecord findByIdAndUserId(
            @Param("id") Long id,
            @Param("userId") Long userId
    );
}
