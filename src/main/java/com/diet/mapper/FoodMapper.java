package com.diet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.diet.domain.food.Food;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface FoodMapper extends BaseMapper<Food> {

    Food findAccessibleById(@Param("userId") Long userId, @Param("id") Long id);

    Food findOwnedCustomById(@Param("userId") Long userId, @Param("id") Long id);

    Food findByAccessibleNameIgnoreCase(@Param("userId") Long userId, @Param("name") String name);

    List<Food> findAll(@Param("userId") Long userId, @Param("keyword") String keyword);

    List<Food> findCustomByUser(@Param("userId") Long userId, @Param("keyword") String keyword);
}
