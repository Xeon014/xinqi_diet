package com.diet.food;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface FoodRepository extends BaseMapper<Food> {

    @Select("select * from food where lower(name) = lower(#{name}) limit 1")
    Food findByNameIgnoreCase(@Param("name") String name);
}