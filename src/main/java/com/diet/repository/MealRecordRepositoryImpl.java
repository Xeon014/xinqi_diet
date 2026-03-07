package com.diet.repository;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.diet.domain.record.MealRecord;
import com.diet.domain.record.MealRecordRepository;
import com.diet.mapper.MealRecordMapper;
import java.time.LocalDate;
import java.util.List;
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
    public List<MealRecord> findByUserAndDate(Long userId, LocalDate date) {
        return mealRecordMapper.selectList(new LambdaQueryWrapper<MealRecord>()
                .eq(MealRecord::getUserId, userId)
                .eq(MealRecord::getRecordDate, date)
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
