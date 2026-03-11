package com.diet.domain.diary;

import java.time.LocalDate;
import java.util.Optional;

public interface HealthDiaryRepository {

    Optional<HealthDiary> findByUserAndDate(Long userId, LocalDate recordDate);

    void save(HealthDiary healthDiary);

    void deleteById(Long id);
}
