package com.diet.repository;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.diet.domain.diary.HealthDiary;
import com.diet.domain.diary.HealthDiaryRepository;
import com.diet.mapper.HealthDiaryMapper;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class HealthDiaryRepositoryImpl implements HealthDiaryRepository {

    private final HealthDiaryMapper healthDiaryMapper;

    public HealthDiaryRepositoryImpl(HealthDiaryMapper healthDiaryMapper) {
        this.healthDiaryMapper = healthDiaryMapper;
    }

    @Override
    public Optional<HealthDiary> findByUserAndDate(Long userId, LocalDate recordDate) {
        return Optional.ofNullable(healthDiaryMapper.selectOne(new LambdaQueryWrapper<HealthDiary>()
                .eq(HealthDiary::getUserId, userId)
                .eq(HealthDiary::getRecordDate, recordDate)
                .last("LIMIT 1")));
    }

    @Override
    public void save(HealthDiary healthDiary) {
        if (healthDiary.getId() == null) {
            healthDiaryMapper.insert(healthDiary);
            return;
        }
        healthDiaryMapper.updateById(healthDiary);
    }

    @Override
    public void deleteById(Long id) {
        healthDiaryMapper.deleteById(id);
    }
}
