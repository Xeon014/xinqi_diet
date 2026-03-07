package com.diet.domain.user;

import java.util.List;
import java.util.Optional;

public interface UserProfileRepository {

    long count();

    void save(UserProfile userProfile);

    void update(UserProfile userProfile);

    Optional<UserProfile> findById(Long id);

    List<UserProfile> findAll();
}
