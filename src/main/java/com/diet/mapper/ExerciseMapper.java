package com.diet.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.diet.domain.exercise.Exercise;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ExerciseMapper extends BaseMapper<Exercise> {

    Exercise findByNameIgnoreCase(String name);

    List<Exercise> findAll(@Param("keyword") String keyword, @Param("category") String category);
}