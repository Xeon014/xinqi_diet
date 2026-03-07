package com.diet.user;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserProfileRepository extends BaseMapper<UserProfile> {

    @Select("select * from user_profile where email = #{email} limit 1")
    UserProfile findByEmail(@Param("email") String email);
}