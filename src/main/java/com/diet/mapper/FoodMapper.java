package com.diet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.diet.domain.food.Food;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface FoodMapper extends BaseMapper<Food> {

    Food findByNameIgnoreCase(String name);
}
