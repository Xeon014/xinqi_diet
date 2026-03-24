package com.diet.infra.exercise;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.diet.domain.exercise.Exercise;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ExerciseMapper extends BaseMapper<Exercise> {

    Exercise findAccessibleById(@Param("userId") Long userId, @Param("id") Long id);

    Exercise findOwnedCustomById(@Param("userId") Long userId, @Param("id") Long id);

    Exercise findByAccessibleNameIgnoreCase(@Param("userId") Long userId, @Param("name") String name);

    List<Exercise> findAll(@Param("userId") Long userId, @Param("keyword") String keyword, @Param("category") String category);

    List<Exercise> findCustomByUser(
            @Param("userId") Long userId,
            @Param("keyword") String keyword,
            @Param("category") String category
    );
}
