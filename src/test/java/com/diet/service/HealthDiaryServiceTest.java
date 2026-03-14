package com.diet.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.diet.domain.diary.HealthDiary;
import com.diet.domain.diary.HealthDiaryRepository;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.dto.diary.HealthDiaryUpsertRequest;
import com.diet.dto.diary.HealthDiaryUpsertResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class HealthDiaryServiceTest {

    @Mock
    private HealthDiaryRepository healthDiaryRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    private HealthDiaryService healthDiaryService;

    @BeforeEach
    void setUp() {
        healthDiaryService = new HealthDiaryService(healthDiaryRepository, userProfileRepository, new ObjectMapper());
    }

    @Test
    void shouldCreateDiaryForFirstUpsert() {
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(new UserProfile()));
        doAnswer(invocation -> {
            HealthDiary diary = invocation.getArgument(0);
            diary.setId(10L);
            return null;
        }).when(healthDiaryRepository).save(any(HealthDiary.class));

        HealthDiaryUpsertResponse response = healthDiaryService.upsert(
                1L,
                new HealthDiaryUpsertRequest(
                        LocalDate.of(2026, 3, 11),
                        "今天状态不错",
                        List.of("cloud://file-a")
                )
        );

        assertThat(response.diary().id()).isEqualTo(10L);
        assertThat(response.diary().content()).isEqualTo("今天状态不错");
        assertThat(response.diary().imageFileIds()).containsExactly("cloud://file-a");
        assertThat(response.removedImageFileIds()).isEmpty();
    }

    @Test
    void shouldReturnRemovedImagesWhenUpdateDiary() {
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(new UserProfile()));
        HealthDiary existing = new HealthDiary(
                1L,
                LocalDate.of(2026, 3, 11),
                "旧内容",
                "[\"cloud://file-a\",\"cloud://file-b\"]"
        );
        existing.setId(100L);

        when(healthDiaryRepository.findByUserAndDate(1L, LocalDate.of(2026, 3, 11)))
                .thenReturn(Optional.of(existing));

        HealthDiaryUpsertResponse response = healthDiaryService.upsert(
                1L,
                new HealthDiaryUpsertRequest(
                        LocalDate.of(2026, 3, 11),
                        "新内容",
                        List.of("cloud://file-b", "cloud://file-c")
                )
        );

        assertThat(response.diary().content()).isEqualTo("新内容");
        assertThat(response.diary().imageFileIds()).containsExactly("cloud://file-b", "cloud://file-c");
        assertThat(response.removedImageFileIds()).containsExactly("cloud://file-a");
        verify(healthDiaryRepository).save(existing);
    }

    @Test
    void shouldRejectWhenContentAndImagesAreBothEmpty() {
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(new UserProfile()));

        assertThatThrownBy(() -> healthDiaryService.upsert(
                1L,
                new HealthDiaryUpsertRequest(LocalDate.of(2026, 3, 11), " ", List.of())
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("content or imageFileIds must not be both empty");
        verify(healthDiaryRepository, never()).save(any(HealthDiary.class));
    }

    @Test
    void shouldRejectWhenImageCountExceedsLimit() {
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(new UserProfile()));

        assertThatThrownBy(() -> healthDiaryService.upsert(
                1L,
                new HealthDiaryUpsertRequest(
                        LocalDate.of(2026, 3, 11),
                        "测试",
                        List.of("1", "2", "3", "4")
                )
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("imageFileIds size must be less than or equal to 3");
    }
}
