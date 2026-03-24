package com.diet.infra.record.meal;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.diet.domain.record.MealRecord;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface MealRecordMapper extends BaseMapper<MealRecord> {
}
