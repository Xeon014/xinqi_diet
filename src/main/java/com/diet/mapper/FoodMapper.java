package com.diet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.diet.domain.food.Food;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface FoodMapper extends BaseMapper<Food> {

    Food findByNameIgnoreCase(String name);

    List<Food> findAll(@Param("keyword") String keyword);
}
