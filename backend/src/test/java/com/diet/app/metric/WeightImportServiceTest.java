package com.diet.app.metric;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.diet.api.metric.DuplicatePolicy;
import com.diet.api.metric.WeightImportConfirmRequest;
import com.diet.api.metric.WeightImportConfirmRow;
import com.diet.api.metric.WeightImportPreviewRequest;
import com.diet.api.metric.WeightImportPreviewResponse;
import com.diet.api.metric.WeightImportResultResponse;
import com.diet.domain.metric.BodyMetricRecord;
import com.diet.domain.metric.BodyMetricRecordRepository;
import com.diet.domain.metric.BodyMetricType;
import com.diet.domain.metric.BodyMetricUnit;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.app.user.GoalPlanningService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WeightImportServiceTest {

    @Mock
    private BodyMetricRecordRepository bodyMetricRecordRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private GoalPlanningService goalPlanningService;

    private WeightImportService weightImportService;

    @BeforeEach
    void setUp() {
        weightImportService = new WeightImportService(
                bodyMetricRecordRepository,
                userProfileRepository,
                goalPlanningService
        );
    }

    // --- Preview: Delimiter Detection ---

    @Test
    void shouldDetectCommaDelimiter() {
        String csv = "date,weight\n2025-01-01,70.5\n2025-01-02,71.0";
        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv));

        assertThat(response.detectedDelimiter()).isEqualTo(",");
        assertThat(response.parsedRows()).isEqualTo(2);
    }

    @Test
    void shouldDetectTabDelimiter() {
        String csv = "日期\t体重 (斤)\t体重变化 (斤)\t状态\t备注\n2025-01-01\t130.0\t0\t正常\t\n2025-01-02\t131.5\t1.5\t正常\t";
        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv));

        assertThat(response.detectedDelimiter()).isEqualTo("Tab");
        assertThat(response.parsedRows()).isEqualTo(2);
        assertThat(response.detectedUnit()).isEqualTo("斤");
    }

    @Test
    void shouldDetectSemicolonDelimiter() {
        String csv = "DateTime;Weight\n25.12.2024;75.5\n26.12.2024;76.0";
        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv));

        assertThat(response.detectedDelimiter()).isEqualTo(";");
    }

    // --- Preview: Column Detection ---

    @Test
    void shouldFindDateColumnByChineseName() {
        String csv = "日期,体重\n2025-01-01,70.5";
        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv));

        assertThat(response.parsedRows()).isEqualTo(1);
        assertThat(response.rows().get(0).parsedDate()).isEqualTo(LocalDate.of(2025, 1, 1));
    }

    @Test
    void shouldFindWeightColumnByChineseName() {
        String csv = "date,体重(kg)\n2025-01-01,70.5";
        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv));

        assertThat(response.parsedRows()).isEqualTo(1);
        assertThat(response.rows().get(0).parsedWeightKg()).isEqualByComparingTo("70.50");
    }

    @Test
    void shouldThrowWhenDateColumnNotFound() {
        String csv = "weight,value\n70.5,100";

        assertThatThrownBy(() -> weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("未找到日期列");
    }

    @Test
    void shouldThrowWhenWeightColumnNotFound() {
        String csv = "date,height\n2025-01-01,170";

        assertThatThrownBy(() -> weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("未找到体重列");
    }

    // --- Preview: Date Parsing ---

    @Test
    void shouldParseIsoDate() {
        String csv = "date,weight\n2025-03-31,70.5";
        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv));

        assertThat(response.rows().get(0).parsedDate()).isEqualTo(LocalDate.of(2025, 3, 31));
    }

    @Test
    void shouldParseIsoDateTime() {
        String csv = "date,weight\n2025-03-31T07:30:00,70.5";
        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv));

        assertThat(response.rows().get(0).parsedDate()).isEqualTo(LocalDate.of(2025, 3, 31));
    }

    @Test
    void shouldParseSlashDate() {
        String csv = "date,weight\n2025/03/31,70.5";
        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv));

        assertThat(response.rows().get(0).parsedDate()).isEqualTo(LocalDate.of(2025, 3, 31));
    }

    @Test
    void shouldParseNonZeroPaddedSlashDate() {
        String csv = "date,weight\n2025/3/1,70.5";
        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv));

        assertThat(response.rows().get(0).parsedDate()).isEqualTo(LocalDate.of(2025, 3, 1));
    }

    @Test
    void shouldMarkInvalidDateRow() {
        String csv = "date,weight\nnot-a-date,70.5\n2025-01-01,71.0";
        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv));

        assertThat(response.skippedRows()).isEqualTo(1);
        assertThat(response.parsedRows()).isEqualTo(1);
        assertThat(response.rows().get(0).error()).isNotNull();
        assertThat(response.rows().get(1).parsedDate()).isEqualTo(LocalDate.of(2025, 1, 1));
    }

    // --- Preview: Unit Detection ---

    @Test
    void shouldDetectJinUnitFromColumnName() {
        String csv = "日期\t体重 (斤)\n2025-01-01\t130.0";
        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv));

        assertThat(response.detectedUnit()).isEqualTo("斤");
        assertThat(response.rows().get(0).parsedWeightKg()).isEqualByComparingTo("65.00");
    }

    @Test
    void shouldDetectLbsUnitFromColumnName() {
        String csv = "date,Weight (lbs)\n2025-01-01,154.0";
        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv));

        assertThat(response.detectedUnit()).isEqualTo("lbs");
        assertThat(response.rows().get(0).parsedWeightKg()).isEqualByComparingTo("69.85");
    }

    @Test
    void shouldKeepKgByDefault() {
        String csv = "date,weight\n2025-01-01,70.5";
        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv));

        assertThat(response.detectedUnit()).isEqualTo("kg");
        assertThat(response.rows().get(0).parsedWeightKg()).isEqualByComparingTo("70.50");
    }

    // --- Preview: Weight Validation ---

    @Test
    void shouldRejectWeightBelowMinimum() {
        String csv = "date,weight\n2025-01-01,15.0";
        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv));

        assertThat(response.skippedRows()).isEqualTo(1);
        assertThat(response.rows().get(0).error()).contains("超出合理范围");
    }

    @Test
    void shouldRejectFutureDate() {
        String futureDate = LocalDate.now().plusDays(1).toString();
        String csv = "date,weight\n" + futureDate + ",70.5";
        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv));

        assertThat(response.skippedRows()).isEqualTo(1);
        assertThat(response.rows().get(0).error()).contains("未来日期");
    }

    // --- Preview: Edge Cases ---

    @Test
    void shouldHandleEmptyFile() {
        assertThatThrownBy(() -> weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", "")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("文件内容为空");
    }

    @Test
    void shouldHandleHeaderOnlyCsv() {
        String csv = "date,weight";
        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv));

        assertThat(response.totalRows()).isEqualTo(0);
        assertThat(response.parsedRows()).isEqualTo(0);
    }

    @Test
    void shouldHandleMixedValidAndInvalidRows() {
        String csv = "date,weight\n2025-01-01,70.5\nbad-date,abc\n2025-01-02,72.0";
        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv));

        assertThat(response.totalRows()).isEqualTo(3);
        assertThat(response.parsedRows()).isEqualTo(2);
        assertThat(response.skippedRows()).isEqualTo(1);
    }

    @Test
    void shouldSkipEmptyLines() {
        String csv = "date,weight\n\n2025-01-01,70.5\n\n2025-01-02,71.0\n";
        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv));

        assertThat(response.totalRows()).isEqualTo(2);
        assertThat(response.parsedRows()).isEqualTo(2);
    }

    @Test
    void shouldAllowPreviewAtImportLimit() {
        StringBuilder csv = new StringBuilder("date,weight\n");
        for (int i = 1; i <= 1000; i++) {
            csv.append("2025-01-")
                    .append(String.format("%02d", ((i - 1) % 28) + 1))
                    .append(",")
                    .append(60 + (i % 10))
                    .append(".0\n");
        }

        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv.toString()));

        assertThat(response.totalRows()).isEqualTo(1000);
        assertThat(response.rows()).hasSize(1000);
    }

    @Test
    void shouldRejectPreviewWhenRowsExceedLimit() {
        StringBuilder csv = new StringBuilder("date,weight\n");
        for (int i = 1; i <= 1001; i++) {
            csv.append("2025-01-")
                    .append(String.format("%02d", ((i - 1) % 28) + 1))
                    .append(",")
                    .append(60 + (i % 10))
                    .append(".0\n");
        }

        assertThatThrownBy(() -> weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv.toString())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("单次最多导入 1000 行");
    }

    @Test
    void shouldParseQuotedMultilineField() {
        String csv = "date,weight,note\n2025-01-01,70.5,\"第一行\n第二行\"";
        WeightImportPreviewResponse response = weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv));

        assertThat(response.totalRows()).isEqualTo(1);
        assertThat(response.parsedRows()).isEqualTo(1);
        assertThat(response.rows().get(0).parsedDate()).isEqualTo(LocalDate.of(2025, 1, 1));
        assertThat(response.rows().get(0).parsedWeightKg()).isEqualByComparingTo("70.50");
    }

    @Test
    void shouldRejectPreviewWhenQuoteIsUnclosed() {
        String csv = "date,weight,note\n2025-01-01,70.5,\"第一行\n第二行";

        assertThatThrownBy(() -> weightImportService.preview(1L,
                new WeightImportPreviewRequest("test.csv", csv)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("未闭合的引号");
    }

    // --- Confirm: SKIP Policy ---

    @Test
    void shouldSkipExistingRecordsWhenPolicyIsSkip() {
        LocalDate date1 = LocalDate.of(2025, 1, 1);
        LocalDate date2 = LocalDate.of(2025, 1, 2);

        BodyMetricRecord existingRecord = buildRecord(10L, date1, new BigDecimal("68.0"));
        when(bodyMetricRecordRepository.findByUserIdAndMetricTypeAndRecordDateIn(
                eq(1L), eq(BodyMetricType.WEIGHT), anyList()))
                .thenReturn(List.of(existingRecord));

        WeightImportResultResponse result = weightImportService.confirm(1L,
                new WeightImportConfirmRequest(
                        List.of(
                                new WeightImportConfirmRow(date1, new BigDecimal("70.5")),
                                new WeightImportConfirmRow(date2, new BigDecimal("71.0"))
                        ),
                        DuplicatePolicy.SKIP
                ));

        assertThat(result.skipped()).isEqualTo(1);
        assertThat(result.imported()).isEqualTo(1);
        verify(bodyMetricRecordRepository).batchInsert(anyList());
    }

    // --- Confirm: OVERWRITE Policy ---

    @Test
    void shouldOverwriteExistingRecordsWhenPolicyIsOverwrite() {
        LocalDate date1 = LocalDate.of(2025, 1, 1);

        BodyMetricRecord existingRecord = buildRecord(10L, date1, new BigDecimal("68.0"));
        when(bodyMetricRecordRepository.findByUserIdAndMetricTypeAndRecordDateIn(
                eq(1L), eq(BodyMetricType.WEIGHT), anyList()))
                .thenReturn(List.of(existingRecord));

        WeightImportResultResponse result = weightImportService.confirm(1L,
                new WeightImportConfirmRequest(
                        List.of(
                                new WeightImportConfirmRow(date1, new BigDecimal("70.5"))
                        ),
                        DuplicatePolicy.OVERWRITE
                ));

        assertThat(result.overwritten()).isEqualTo(1);
        assertThat(existingRecord.getMetricValue()).isEqualByComparingTo("70.5");
        verify(bodyMetricRecordRepository).save(any(BodyMetricRecord.class));
    }

    // --- Confirm: Deduplication ---

    @Test
    void shouldDeduplicateRequestRowsByDate() {
        LocalDate date = LocalDate.of(2025, 1, 1);
        when(bodyMetricRecordRepository.findByUserIdAndMetricTypeAndRecordDateIn(
                eq(1L), eq(BodyMetricType.WEIGHT), anyList()))
                .thenReturn(List.of());

        WeightImportResultResponse result = weightImportService.confirm(1L,
                new WeightImportConfirmRequest(
                        List.of(
                                new WeightImportConfirmRow(date, new BigDecimal("70.0")),
                                new WeightImportConfirmRow(date, new BigDecimal("70.5"))
                        ),
                        DuplicatePolicy.SKIP
                ));

        assertThat(result.imported()).isEqualTo(1);
    }

    // --- Confirm: Today's Weight Sync ---

    @Test
    void shouldSyncCurrentWeightWhenTodayIsImported() {
        UserProfile user = new UserProfile();
        user.setId(1L);
        user.setCurrentWeight(new BigDecimal("68.0"));
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(user));
        when(bodyMetricRecordRepository.findByUserIdAndMetricTypeAndRecordDateIn(
                eq(1L), eq(BodyMetricType.WEIGHT), anyList()))
                .thenReturn(List.of());

        weightImportService.confirm(1L,
                new WeightImportConfirmRequest(
                        List.of(
                                new WeightImportConfirmRow(LocalDate.now(), new BigDecimal("70.5"))
                        ),
                        DuplicatePolicy.SKIP
                ));

        assertThat(user.getCurrentWeight()).isEqualByComparingTo("70.5");
        verify(userProfileRepository).update(user);
    }

    @Test
    void shouldNotSyncCurrentWeightWhenTodayRecordIsSkipped() {
        LocalDate today = LocalDate.now();
        BodyMetricRecord existingRecord = buildRecord(10L, today, new BigDecimal("68.0"));
        when(bodyMetricRecordRepository.findByUserIdAndMetricTypeAndRecordDateIn(
                eq(1L), eq(BodyMetricType.WEIGHT), anyList()))
                .thenReturn(List.of(existingRecord));

        weightImportService.confirm(1L,
                new WeightImportConfirmRequest(
                        List.of(new WeightImportConfirmRow(today, new BigDecimal("70.5"))),
                        DuplicatePolicy.SKIP
                ));

        verify(userProfileRepository, never()).findById(any());
        verify(userProfileRepository, never()).update(any());
    }

    @Test
    void shouldSyncCurrentWeightWhenTodayRecordIsOverwritten() {
        LocalDate today = LocalDate.now();
        BodyMetricRecord existingRecord = buildRecord(10L, today, new BigDecimal("68.0"));
        UserProfile user = new UserProfile();
        user.setId(1L);
        user.setCurrentWeight(new BigDecimal("68.0"));
        when(bodyMetricRecordRepository.findByUserIdAndMetricTypeAndRecordDateIn(
                eq(1L), eq(BodyMetricType.WEIGHT), anyList()))
                .thenReturn(List.of(existingRecord));
        when(userProfileRepository.findById(1L)).thenReturn(Optional.of(user));

        weightImportService.confirm(1L,
                new WeightImportConfirmRequest(
                        List.of(new WeightImportConfirmRow(today, new BigDecimal("70.5"))),
                        DuplicatePolicy.OVERWRITE
                ));

        assertThat(user.getCurrentWeight()).isEqualByComparingTo("70.5");
        verify(userProfileRepository).update(user);
    }

    @Test
    void shouldNotSyncCurrentWeightWhenTodayIsNotImported() {
        when(bodyMetricRecordRepository.findByUserIdAndMetricTypeAndRecordDateIn(
                eq(1L), eq(BodyMetricType.WEIGHT), anyList()))
                .thenReturn(List.of());

        weightImportService.confirm(1L,
                new WeightImportConfirmRequest(
                        List.of(
                                new WeightImportConfirmRow(LocalDate.of(2025, 1, 1), new BigDecimal("70.5"))
                        ),
                        DuplicatePolicy.SKIP
                ));

        verify(userProfileRepository, never()).findById(any());
        verify(userProfileRepository, never()).update(any());
    }

    @Test
    void shouldRejectFutureDateDuringConfirm() {
        assertThatThrownBy(() -> weightImportService.confirm(1L,
                new WeightImportConfirmRequest(
                        List.of(new WeightImportConfirmRow(LocalDate.now().plusDays(1), new BigDecimal("70.5"))),
                        DuplicatePolicy.SKIP
                )))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("导入日期不能晚于今天");
    }

    @Test
    void shouldRejectOutOfRangeWeightDuringConfirm() {
        assertThatThrownBy(() -> weightImportService.confirm(1L,
                new WeightImportConfirmRequest(
                        List.of(new WeightImportConfirmRow(LocalDate.now(), new BigDecimal("10.0"))),
                        DuplicatePolicy.SKIP
                )))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("体重超出合理范围");
    }

    // --- Helper ---

    private BodyMetricRecord buildRecord(Long id, LocalDate date, BigDecimal weight) {
        BodyMetricRecord record = new BodyMetricRecord();
        record.setId(id);
        record.setUserId(1L);
        record.setMetricType(BodyMetricType.WEIGHT);
        record.setMetricValue(weight);
        record.setUnit(BodyMetricUnit.KG);
        record.setRecordDate(date);
        return record;
    }
}
