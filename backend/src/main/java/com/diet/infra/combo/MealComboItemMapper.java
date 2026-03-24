package com.diet.infra.combo;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.diet.domain.combo.MealComboItem;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface MealComboItemMapper extends BaseMapper<MealComboItem> {
}
