package com.diet.repository;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.diet.domain.record.MealRecord;
import com.diet.domain.record.MealRecordRepository;
import com.diet.domain.record.MealType;
import com.diet.mapper.MealRecordMapper;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class MealRecordRepositoryImpl implements MealRecordRepository {

    private final MealRecordMapper mealRecordMapper;

    public MealRecordRepositoryImpl(MealRecordMapper mealRecordMapper) {
        this.mealRecordMapper = mealRecordMapper;
    }

    @Override
    public long count() {
        return mealRecordMapper.selectCount(null);
    }

    @Override
    public void save(MealRecord mealRecord) {
        if (mealRecord.getId() == null) {
            mealRecordMapper.insert(mealRecord);
            return;
        }
        mealRecordMapper.updateById(mealRecord);
    }

    @Override
    public Optional<MealRecord> findById(Long id) {
        return Optional.ofNullable(mealRecordMapper.selectById(id));
    }

    @Override
    public void deleteById(Long id) {
        mealRecordMapper.deleteById(id);
    }

    @Override
    public List<MealRecord> findByUserAndDate(Long userId, LocalDate date) {
        return mealRecordMapper.selectList(new LambdaQueryWrapper<MealRecord>()
                .eq(MealRecord::getUserId, userId)
                .eq(MealRecord::getRecordDate, date)
                .orderByAsc(MealRecord::getCreatedAt));
    }

    @Override
    public List<MealRecord> findByUserAndDateAndMealType(Long userId, LocalDate date, MealType mealType) {
        return mealRecordMapper.selectList(new LambdaQueryWrapper<MealRecord>()
                .eq(MealRecord::getUserId, userId)
                .eq(MealRecord::getRecordDate, date)
                .eq(MealRecord::getMealType, mealType)
                .orderByAsc(MealRecord::getCreatedAt));
    }

    @Override
    public List<MealRecord> findByUserAndDateRange(Long userId, LocalDate startDate, LocalDate endDate) {
        return mealRecordMapper.selectList(new LambdaQueryWrapper<MealRecord>()
                .eq(MealRecord::getUserId, userId)
                .between(MealRecord::getRecordDate, startDate, endDate)
                .orderByAsc(MealRecord::getRecordDate)
                .orderByAsc(MealRecord::getCreatedAt));
    }
}
