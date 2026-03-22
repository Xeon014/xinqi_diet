package com.diet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.diet.domain.exercise.ExerciseRecord;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ExerciseRecordMapper extends BaseMapper<ExerciseRecord> {
}