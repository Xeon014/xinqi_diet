package com.diet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.diet.domain.diary.HealthDiary;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface HealthDiaryMapper extends BaseMapper<HealthDiary> {
}
