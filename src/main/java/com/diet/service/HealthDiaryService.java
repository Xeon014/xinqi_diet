package com.diet.service;

import com.diet.common.NotFoundException;
import com.diet.domain.diary.HealthDiary;
import com.diet.domain.diary.HealthDiaryRepository;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.diary.HealthDiaryDeleteResponse;
import com.diet.dto.diary.HealthDiaryResponse;
import com.diet.dto.diary.HealthDiaryUpsertRequest;
import com.diet.dto.diary.HealthDiaryUpsertResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class HealthDiaryService {

    private static final int MAX_IMAGE_COUNT = 3;

    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {
    };

    private final HealthDiaryRepository healthDiaryRepository;

    private final UserProfileRepository userProfileRepository;

    private final ObjectMapper objectMapper;

    public HealthDiaryService(
            HealthDiaryRepository healthDiaryRepository,
            UserProfileRepository userProfileRepository,
            ObjectMapper objectMapper
    ) {
        this.healthDiaryRepository = healthDiaryRepository;
        this.userProfileRepository = userProfileRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Optional<HealthDiaryResponse> findDaily(Long userId, LocalDate recordDate) {
        return healthDiaryRepository.findByUserAndDate(userId, recordDate)
                .map(this::toResponse);
    }

    public HealthDiaryUpsertResponse upsert(Long userId, HealthDiaryUpsertRequest request) {
        ensureUserExists(userId);
        String normalizedContent = normalizeContent(request.content());
        List<String> normalizedImageFileIds = normalizeImageFileIds(request.imageFileIds());
        validateContentAndImages(normalizedContent, normalizedImageFileIds);

        Optional<HealthDiary> existingOpt = healthDiaryRepository.findByUserAndDate(userId, request.recordDate());
        if (existingOpt.isEmpty()) {
            HealthDiary created = new HealthDiary(
                    userId,
                    request.recordDate(),
                    normalizedContent,
                    serializeImageFileIds(normalizedImageFileIds)
            );
            healthDiaryRepository.save(created);
            return new HealthDiaryUpsertResponse(toResponse(created), List.of());
        }

        HealthDiary existing = existingOpt.get();
        List<String> previousImageFileIds = parseImageFileIds(existing.getImageFileIds());

        existing.setContent(normalizedContent);
        existing.setImageFileIds(serializeImageFileIds(normalizedImageFileIds));
        existing.setUpdatedAt(LocalDateTime.now());
        healthDiaryRepository.save(existing);

        return new HealthDiaryUpsertResponse(
                toResponse(existing),
                resolveRemovedImageFileIds(previousImageFileIds, normalizedImageFileIds)
        );
    }

    public HealthDiaryDeleteResponse deleteByDate(Long userId, LocalDate recordDate) {
        ensureUserExists(userId);
        Optional<HealthDiary> existingOpt = healthDiaryRepository.findByUserAndDate(userId, recordDate);
        if (existingOpt.isEmpty()) {
            return new HealthDiaryDeleteResponse(false, List.of());
        }

        HealthDiary existing = existingOpt.get();
        List<String> removedImageFileIds = parseImageFileIds(existing.getImageFileIds());
        healthDiaryRepository.deleteById(existing.getId());
        return new HealthDiaryDeleteResponse(true, removedImageFileIds);
    }

    private HealthDiaryResponse toResponse(HealthDiary healthDiary) {
        return new HealthDiaryResponse(
                healthDiary.getId(),
                healthDiary.getUserId(),
                healthDiary.getRecordDate(),
                healthDiary.getContent(),
                parseImageFileIds(healthDiary.getImageFileIds()),
                healthDiary.getCreatedAt(),
                healthDiary.getUpdatedAt()
        );
    }

    private String normalizeContent(String content) {
        if (content == null) {
            return null;
        }
        String trimmed = content.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.length() > 500) {
            throw new IllegalArgumentException("content length must be less than or equal to 500");
        }
        return trimmed;
    }

    private List<String> normalizeImageFileIds(List<String> imageFileIds) {
        if (imageFileIds == null || imageFileIds.isEmpty()) {
            return List.of();
        }
        List<String> normalized = new ArrayList<>();
        for (String imageFileId : imageFileIds) {
            if (imageFileId == null) {
                throw new IllegalArgumentException("imageFileId must not be blank");
            }
            String trimmed = imageFileId.trim();
            if (trimmed.isEmpty()) {
                throw new IllegalArgumentException("imageFileId must not be blank");
            }
            normalized.add(trimmed);
        }
        if (normalized.size() > MAX_IMAGE_COUNT) {
            throw new IllegalArgumentException("imageFileIds size must be less than or equal to " + MAX_IMAGE_COUNT);
        }
        return normalized;
    }

    private void validateContentAndImages(String content, List<String> imageFileIds) {
        if (content == null && imageFileIds.isEmpty()) {
            throw new IllegalArgumentException("content or imageFileIds must not be both empty");
        }
    }

    private String serializeImageFileIds(List<String> imageFileIds) {
        try {
            return objectMapper.writeValueAsString(imageFileIds);
        } catch (Exception exception) {
            throw new IllegalStateException("failed to serialize imageFileIds", exception);
        }
    }

    private List<String> parseImageFileIds(String imageFileIdsJson) {
        if (imageFileIdsJson == null || imageFileIdsJson.isBlank()) {
            return List.of();
        }
        try {
            List<String> parsed = objectMapper.readValue(imageFileIdsJson, STRING_LIST_TYPE);
            if (parsed == null || parsed.isEmpty()) {
                return List.of();
            }
            return parsed.stream()
                    .filter(value -> value != null && !value.isBlank())
                    .map(String::trim)
                    .toList();
        } catch (Exception exception) {
            throw new IllegalStateException("failed to parse imageFileIds", exception);
        }
    }

    private List<String> resolveRemovedImageFileIds(List<String> previousImageFileIds, List<String> currentImageFileIds) {
        Set<String> currentSet = new LinkedHashSet<>(currentImageFileIds);
        return previousImageFileIds.stream()
                .filter(fileId -> !currentSet.contains(fileId))
                .toList();
    }

    private void ensureUserExists(Long userId) {
        if (userProfileRepository.findById(userId).isEmpty()) {
            throw new NotFoundException("user not found, id=" + userId);
        }
    }
}
