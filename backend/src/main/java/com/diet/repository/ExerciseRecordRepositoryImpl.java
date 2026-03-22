package com.diet.repository;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.diet.domain.exercise.ExerciseRecord;
import com.diet.domain.exercise.ExerciseRecordRepository;
import com.diet.mapper.ExerciseRecordMapper;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class ExerciseRecordRepositoryImpl implements ExerciseRecordRepository {

    private final ExerciseRecordMapper exerciseRecordMapper;

    public ExerciseRecordRepositoryImpl(ExerciseRecordMapper exerciseRecordMapper) {
        this.exerciseRecordMapper = exerciseRecordMapper;
    }

    @Override
    public long count() {
        return exerciseRecordMapper.selectCount(null);
    }

    @Override
    public void save(ExerciseRecord exerciseRecord) {
        if (exerciseRecord.getId() == null) {
            exerciseRecordMapper.insert(exerciseRecord);
            return;
        }
        exerciseRecordMapper.updateById(exerciseRecord);
    }

    @Override
    public Optional<ExerciseRecord> findById(Long id) {
        return Optional.ofNullable(exerciseRecordMapper.selectById(id));
    }

    @Override
    public void deleteById(Long id) {
        exerciseRecordMapper.deleteById(id);
    }

    @Override
    public long countByExerciseId(Long exerciseId) {
        return exerciseRecordMapper.selectCount(new LambdaQueryWrapper<ExerciseRecord>()
                .eq(ExerciseRecord::getExerciseId, exerciseId));
    }

    @Override
    public List<ExerciseRecord> findByUserAndDate(Long userId, LocalDate date) {
        return exerciseRecordMapper.selectList(new LambdaQueryWrapper<ExerciseRecord>()
                .eq(ExerciseRecord::getUserId, userId)
                .eq(ExerciseRecord::getRecordDate, date)
                .orderByAsc(ExerciseRecord::getCreatedAt));
    }

    @Override
    public List<ExerciseRecord> findByUserAndDateRange(Long userId, LocalDate startDate, LocalDate endDate) {
        return exerciseRecordMapper.selectList(new LambdaQueryWrapper<ExerciseRecord>()
                .eq(ExerciseRecord::getUserId, userId)
                .between(ExerciseRecord::getRecordDate, startDate, endDate)
                .orderByAsc(ExerciseRecord::getRecordDate)
                .orderByAsc(ExerciseRecord::getCreatedAt));
    }
}
