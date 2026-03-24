package com.diet.infra.user;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.infra.user.UserProfileMapper;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class UserProfileRepositoryImpl implements UserProfileRepository {

    private final UserProfileMapper userProfileMapper;

    public UserProfileRepositoryImpl(UserProfileMapper userProfileMapper) {
        this.userProfileMapper = userProfileMapper;
    }

    @Override
    public long count() {
        return userProfileMapper.selectCount(null);
    }

    @Override
    public void save(UserProfile userProfile) {
        if (userProfile.getId() == null) {
            userProfileMapper.insert(userProfile);
            return;
        }
        userProfileMapper.updateById(userProfile);
    }

    @Override
    public void update(UserProfile userProfile) {
        userProfileMapper.updateById(userProfile);
    }

    @Override
    public Optional<UserProfile> findById(Long id) {
        return Optional.ofNullable(userProfileMapper.selectById(id));
    }

    @Override
    public Optional<UserProfile> findByOpenId(String openId) {
        return Optional.ofNullable(userProfileMapper.selectOne(new LambdaQueryWrapper<UserProfile>()
                .eq(UserProfile::getOpenId, openId)
                .last("LIMIT 1")));
    }

    @Override
    public List<UserProfile> findAll() {
        return userProfileMapper.selectList(new LambdaQueryWrapper<UserProfile>()
                .orderByAsc(UserProfile::getId));
    }
}
