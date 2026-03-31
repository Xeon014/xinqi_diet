package com.diet.app.metric;

import com.diet.api.metric.DuplicatePolicy;
import com.diet.api.metric.WeightImportConfirmRequest;
import com.diet.api.metric.WeightImportConfirmRow;
import com.diet.api.metric.WeightImportPreviewRequest;
import com.diet.api.metric.WeightImportPreviewResponse;
import com.diet.api.metric.WeightImportPreviewRow;
import com.diet.api.metric.WeightImportResultResponse;
import com.diet.api.user.GoalPlanPreviewResponse;
import com.diet.app.user.GoalPlanningService;
import com.diet.domain.metric.BodyMetricRecord;
import com.diet.domain.metric.BodyMetricRecordRepository;
import com.diet.domain.metric.BodyMetricType;
import com.diet.domain.metric.BodyMetricUnit;
import com.diet.domain.user.GoalCalorieStrategy;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.CellValue;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.FormulaEvaluator;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class WeightImportService {

    private static final BigDecimal MIN_WEIGHT_KG = new BigDecimal("20.0");
    private static final BigDecimal MAX_WEIGHT_KG = new BigDecimal("300.0");
    private static final BigDecimal LBS_TO_KG_FACTOR = new BigDecimal("0.45359237");
    private static final BigDecimal JIN_TO_KG_FACTOR = new BigDecimal("2");
    private static final int MAX_IMPORT_ROWS = 1000;
    private static final int SHEET_HEADER_SCAN_LIMIT = 10;

    private static final List<String> DATE_KEYWORDS = List.of(
            "date", "datetime", "start_time", "时间", "日期", "记录时间", "record_date"
    );

    private static final List<String> WEIGHT_KEYWORDS = List.of(
            "weight", "体重", "body_mass", "body mass", "mass"
    );

    private final BodyMetricRecordRepository bodyMetricRecordRepository;
    private final UserProfileRepository userProfileRepository;
    private final GoalPlanningService goalPlanningService;

    public WeightImportService(
            BodyMetricRecordRepository bodyMetricRecordRepository,
            UserProfileRepository userProfileRepository,
            GoalPlanningService goalPlanningService
    ) {
        this.bodyMetricRecordRepository = bodyMetricRecordRepository;
        this.userProfileRepository = userProfileRepository;
        this.goalPlanningService = goalPlanningService;
    }

    public WeightImportPreviewResponse preview(Long userId, WeightImportPreviewRequest request) {
        UploadedFile uploadedFile = resolveUploadedFile(request);
        if (uploadedFile.bytes() == null) {
            return parseCsvPreview(uploadedFile.fileName(), uploadedFile.textContent());
        }

        ImportFileType fileType = detectFileType(uploadedFile.bytes(), uploadedFile.fileName());
        return switch (fileType) {
            case CSV -> parseCsvPreview(uploadedFile.fileName(), decodeBytesToString(uploadedFile.bytes()));
            case XLSX -> parseXlsxPreview(uploadedFile.fileName(), uploadedFile.bytes());
        };
    }

    public WeightImportResultResponse confirm(Long userId, WeightImportConfirmRequest request) {
        validateConfirmRequest(request);
        List<WeightImportConfirmRow> rows = request.rows();

        Map<LocalDate, BigDecimal> dateWeightMap = new LinkedHashMap<>();
        for (WeightImportConfirmRow row : rows) {
            dateWeightMap.put(row.date(), row.weightKg());
        }
        List<LocalDate> dates = new ArrayList<>(dateWeightMap.keySet());
        List<BodyMetricRecord> existingRecords = bodyMetricRecordRepository
                .findByUserIdAndMetricTypeAndRecordDateIn(userId, BodyMetricType.WEIGHT, dates);

        Map<LocalDate, BodyMetricRecord> existingMap = new LinkedHashMap<>();
        for (BodyMetricRecord rec : existingRecords) {
            existingMap.put(rec.getRecordDate(), rec);
        }

        List<BodyMetricRecord> toInsert = new ArrayList<>();
        int imported = 0;
        int skipped = 0;
        int overwritten = 0;
        BigDecimal appliedTodayWeight = null;
        LocalDate today = LocalDate.now();

        for (Map.Entry<LocalDate, BigDecimal> entry : dateWeightMap.entrySet()) {
            LocalDate date = entry.getKey();
            BigDecimal weightKg = entry.getValue();

            if (existingMap.containsKey(date)) {
                if (request.duplicatePolicy() == DuplicatePolicy.OVERWRITE) {
                    BodyMetricRecord existing = existingMap.get(date);
                    existing.setMetricValue(weightKg);
                    existing.setUpdatedAt(LocalDateTime.now());
                    bodyMetricRecordRepository.save(existing);
                    overwritten++;
                    if (date.equals(today)) {
                        appliedTodayWeight = weightKg;
                    }
                } else {
                    skipped++;
                }
            } else {
                toInsert.add(new BodyMetricRecord(userId, BodyMetricType.WEIGHT, weightKg, BodyMetricUnit.KG, date));
                if (date.equals(today)) {
                    appliedTodayWeight = weightKg;
                }
            }
        }

        if (!toInsert.isEmpty()) {
            bodyMetricRecordRepository.batchInsert(toInsert);
            imported = toInsert.size();
        }

        if (appliedTodayWeight != null) {
            syncCurrentWeight(userId, appliedTodayWeight);
        }

        return new WeightImportResultResponse(
                dateWeightMap.size(),
                imported,
                skipped,
                overwritten,
                List.of()
        );
    }

    private WeightImportPreviewResponse parseCsvPreview(String fileName, String content) {
        String normalizedContent = stripBom(content);
        if (normalizedContent == null || normalizedContent.trim().isEmpty()) {
            throw new IllegalArgumentException("文件内容为空");
        }

        String headerLine = findFirstNonEmptyLine(normalizedContent);
        if (headerLine == null) {
            throw new IllegalArgumentException("文件内容为空");
        }

        char delimiter = detectDelimiter(headerLine);
        String delimiterName = delimiterName(delimiter);
        List<List<String>> records = parseCsvRecords(normalizedContent, delimiter);
        int headerIndex = findFirstNonEmptyRecordIndex(records);
        if (headerIndex < 0) {
            throw new IllegalArgumentException("文件内容为空");
        }

        int dataRowCount = countNonEmptyRecords(records, headerIndex + 1);
        ensureRowLimit(dataRowCount);

        List<String> headers = sanitizeRecord(records.get(headerIndex));
        int dateCol = findColumn(headers, DATE_KEYWORDS);
        int weightCol = findColumn(headers, WEIGHT_KEYWORDS);

        if (dateCol < 0) {
            throw new IllegalArgumentException("未找到日期列，请确保表头中包含 date、时间 或 日期 等关键词");
        }
        if (weightCol < 0) {
            throw new IllegalArgumentException("未找到体重列，请确保表头中包含 weight、体重 或 body_mass 等关键词");
        }

        String detectedUnit = detectUnit(headers.get(weightCol));
        PreviewStats stats = buildPreviewStats(records, headerIndex + 1, dateCol, weightCol, detectedUnit);
        return new WeightImportPreviewResponse(
                fileName,
                ImportFileType.CSV.name(),
                null,
                stats.totalRows(),
                stats.parsedRows(),
                stats.skippedRows(),
                delimiterName,
                stats.detectedDateFormat(),
                detectedUnit,
                stats.rows()
        );
    }

    private WeightImportPreviewResponse parseXlsxPreview(String fileName, byte[] bytes) {
        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(bytes))) {
            DataFormatter formatter = new DataFormatter(Locale.getDefault());
            FormulaEvaluator evaluator = workbook.getCreationHelper().createFormulaEvaluator();
            SheetMatch sheetMatch = findFirstEffectiveSheet(workbook, formatter, evaluator);
            if (sheetMatch == null) {
                throw new IllegalArgumentException("未找到包含日期列和体重列的工作表");
            }

            Sheet sheet = workbook.getSheetAt(sheetMatch.sheetIndex());
            int dataRowCount = countNonEmptySheetRows(sheet, sheetMatch.headerRowIndex() + 1, formatter, evaluator);
            ensureRowLimit(dataRowCount);

            PreviewStats stats = buildSheetPreviewStats(sheet, sheetMatch, formatter, evaluator);
            return new WeightImportPreviewResponse(
                    fileName,
                    ImportFileType.XLSX.name(),
                    sheetMatch.sheetName(),
                    stats.totalRows(),
                    stats.parsedRows(),
                    stats.skippedRows(),
                    null,
                    stats.detectedDateFormat(),
                    sheetMatch.detectedUnit(),
                    stats.rows()
            );
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Excel 文件已损坏或格式不正确", e);
        }
    }

    private PreviewStats buildPreviewStats(
            List<List<String>> records,
            int startIndex,
            int dateCol,
            int weightCol,
            String detectedUnit
    ) {
        String detectedDateFormat = null;
        List<WeightImportPreviewRow> previewRows = new ArrayList<>();
        int totalRows = 0;
        int parsedRows = 0;
        int skippedRows = 0;

        for (int i = startIndex; i < records.size(); i++) {
            List<String> fields = sanitizeRecord(records.get(i));
            if (isBlankRecord(fields)) {
                continue;
            }
            totalRows++;

            PreviewEvaluation evaluation = evaluatePreviewRow(
                    fields.size() > dateCol ? fields.get(dateCol).trim() : "",
                    fields.size() > weightCol ? fields.get(weightCol).trim() : "",
                    null,
                    null,
                    detectedUnit
            );
            if (evaluation.detectedDateFormat() != null && detectedDateFormat == null) {
                detectedDateFormat = evaluation.detectedDateFormat();
            }
            previewRows.add(evaluation.row());
            if (evaluation.row().error() == null) {
                parsedRows++;
            } else {
                skippedRows++;
            }
        }

        return new PreviewStats(totalRows, parsedRows, skippedRows, detectedDateFormat, previewRows);
    }

    private PreviewStats buildSheetPreviewStats(
            Sheet sheet,
            SheetMatch sheetMatch,
            DataFormatter formatter,
            FormulaEvaluator evaluator
    ) {
        String detectedDateFormat = null;
        List<WeightImportPreviewRow> previewRows = new ArrayList<>();
        int totalRows = 0;
        int parsedRows = 0;
        int skippedRows = 0;

        for (int rowIndex = sheetMatch.headerRowIndex() + 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
            Row row = sheet.getRow(rowIndex);
            List<String> values = extractRowValues(row, formatter, evaluator);
            if (isBlankRecord(values)) {
                continue;
            }
            totalRows++;

            Cell dateCell = row == null ? null : row.getCell(sheetMatch.dateCol());
            Cell weightCell = row == null ? null : row.getCell(sheetMatch.weightCol());
            String rawDate = getCellDisplayValue(dateCell, formatter, evaluator).trim();
            String rawWeight = getCellDisplayValue(weightCell, formatter, evaluator).trim();

            PreviewEvaluation evaluation = evaluatePreviewRow(
                    rawDate,
                    rawWeight,
                    dateCell,
                    weightCell,
                    sheetMatch.detectedUnit(),
                    evaluator
            );
            if (evaluation.detectedDateFormat() != null && detectedDateFormat == null) {
                detectedDateFormat = evaluation.detectedDateFormat();
            }
            previewRows.add(evaluation.row());
            if (evaluation.row().error() == null) {
                parsedRows++;
            } else {
                skippedRows++;
            }
        }

        return new PreviewStats(totalRows, parsedRows, skippedRows, detectedDateFormat, previewRows);
    }

    private PreviewEvaluation evaluatePreviewRow(
            String rawDate,
            String rawWeight,
            Cell dateCell,
            Cell weightCell,
            String detectedUnit
    ) {
        return evaluatePreviewRow(rawDate, rawWeight, dateCell, weightCell, detectedUnit, null);
    }

    private PreviewEvaluation evaluatePreviewRow(
            String rawDate,
            String rawWeight,
            Cell dateCell,
            Cell weightCell,
            String detectedUnit,
            FormulaEvaluator evaluator
    ) {
        if (rawDate.isEmpty() && rawWeight.isEmpty()) {
            return new PreviewEvaluation(new WeightImportPreviewRow(rawDate, rawWeight, null, null, "空行"), null);
        }

        WeightImportDateParser.ParseResult dateParseResult = parseCellDate(dateCell, rawDate, evaluator);
        LocalDate parsedDate = dateParseResult.date();
        String detectedDateFormat = dateParseResult.matchedPattern();
        BigDecimal rawWeightValue = parseCellWeight(weightCell, rawWeight, evaluator);
        if (parsedDate == null || rawWeightValue == null) {
            String error = parsedDate == null ? "日期格式无法识别: " + rawDate : "体重数值无效: " + rawWeight;
            return new PreviewEvaluation(new WeightImportPreviewRow(rawDate, rawWeight, null, null, error), detectedDateFormat);
        }

        BigDecimal weightKg = convertToKg(rawWeightValue, detectedUnit);
        if (weightKg.compareTo(MIN_WEIGHT_KG) < 0 || weightKg.compareTo(MAX_WEIGHT_KG) > 0) {
            return new PreviewEvaluation(
                    new WeightImportPreviewRow(
                            rawDate,
                            rawWeight,
                            parsedDate,
                            weightKg,
                            "体重超出合理范围 (" + MIN_WEIGHT_KG + " - " + MAX_WEIGHT_KG + " kg)"
                    ),
                    detectedDateFormat
            );
        }

        if (parsedDate.isAfter(LocalDate.now())) {
            return new PreviewEvaluation(
                    new WeightImportPreviewRow(rawDate, rawWeight, parsedDate, weightKg, "未来日期"),
                    detectedDateFormat
            );
        }

        return new PreviewEvaluation(
                new WeightImportPreviewRow(rawDate, rawWeight, parsedDate, weightKg, null),
                detectedDateFormat
        );
    }

    private void validateConfirmRequest(WeightImportConfirmRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("导入请求不能为空");
        }
        if (request.duplicatePolicy() == null) {
            throw new IllegalArgumentException("请选择重复记录处理策略");
        }

        List<WeightImportConfirmRow> rows = request.rows();
        if (rows == null || rows.isEmpty()) {
            throw new IllegalArgumentException("没有可导入的数据");
        }
        if (rows.size() > MAX_IMPORT_ROWS) {
            throw new IllegalArgumentException("单次最多导入 1000 行，请拆分后重试");
        }

        LocalDate today = LocalDate.now();
        for (WeightImportConfirmRow row : rows) {
            if (row == null) {
                throw new IllegalArgumentException("导入数据存在空行");
            }
            if (row.date() == null) {
                throw new IllegalArgumentException("导入日期不能为空");
            }
            if (row.date().isAfter(today)) {
                throw new IllegalArgumentException("导入日期不能晚于今天");
            }
            if (row.weightKg() == null) {
                throw new IllegalArgumentException("体重不能为空");
            }
            if (row.weightKg().compareTo(MIN_WEIGHT_KG) < 0 || row.weightKg().compareTo(MAX_WEIGHT_KG) > 0) {
                throw new IllegalArgumentException("体重超出合理范围（20.0 - 300.0 kg）");
            }
        }
    }

    private UploadedFile resolveUploadedFile(WeightImportPreviewRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("导入请求不能为空");
        }
        if (request.fileBase64() != null && !request.fileBase64().isBlank()) {
            try {
                return new UploadedFile(request.fileName(), Base64.getDecoder().decode(request.fileBase64()), null);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("文件内容编码无效", e);
            }
        }
        return new UploadedFile(request.fileName(), null, request.fileContent());
    }

    private ImportFileType detectFileType(byte[] bytes, String fileName) {
        String extension = extractExtension(fileName);
        if ("xls".equals(extension) || isOle2Workbook(bytes)) {
            throw new IllegalArgumentException("暂不支持 xls 文件，请另存为 xlsx 或 CSV 后再导入");
        }
        if ("xlsm".equals(extension)) {
            throw new IllegalArgumentException("暂不支持该文件格式，请上传 CSV 或 xlsx 文件");
        }
        if ("xlsx".equals(extension)) {
            if (!isZipFile(bytes) || !isXlsxWorkbook(bytes)) {
                throw new IllegalArgumentException("Excel 文件已损坏或格式不正确");
            }
            return ImportFileType.XLSX;
        }
        if (isZipFile(bytes)) {
            if (isXlsxWorkbook(bytes)) {
                return ImportFileType.XLSX;
            }
            throw new IllegalArgumentException("暂不支持该文件格式，请上传 CSV 或 xlsx 文件");
        }
        if (looksLikeBinary(bytes)) {
            throw new IllegalArgumentException("暂不支持该文件格式，请上传 CSV 或 xlsx 文件");
        }
        return ImportFileType.CSV;
    }

    private boolean isZipFile(byte[] bytes) {
        return bytes.length >= 4
                && (bytes[0] & 0xFF) == 0x50
                && (bytes[1] & 0xFF) == 0x4B
                && (bytes[2] & 0xFF) == 0x03
                && (bytes[3] & 0xFF) == 0x04;
    }

    private boolean isOle2Workbook(byte[] bytes) {
        return bytes.length >= 8
                && (bytes[0] & 0xFF) == 0xD0
                && (bytes[1] & 0xFF) == 0xCF
                && (bytes[2] & 0xFF) == 0x11
                && (bytes[3] & 0xFF) == 0xE0
                && (bytes[4] & 0xFF) == 0xA1
                && (bytes[5] & 0xFF) == 0xB1
                && (bytes[6] & 0xFF) == 0x1A
                && (bytes[7] & 0xFF) == 0xE1;
    }

    private boolean isXlsxWorkbook(byte[] bytes) {
        boolean foundContentTypes = false;
        boolean foundWorkbook = false;
        try (ZipInputStream zipInputStream = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            while ((entry = zipInputStream.getNextEntry()) != null) {
                String name = entry.getName();
                if ("[Content_Types].xml".equals(name)) {
                    foundContentTypes = true;
                }
                if ("xl/workbook.xml".equals(name)) {
                    foundWorkbook = true;
                }
                if (foundContentTypes && foundWorkbook) {
                    return true;
                }
            }
        } catch (IOException ignored) {
        }
        return false;
    }

    private boolean looksLikeBinary(byte[] bytes) {
        int sampleSize = Math.min(bytes.length, 512);
        int suspicious = 0;
        for (int i = 0; i < sampleSize; i++) {
            int value = bytes[i] & 0xFF;
            if (value == 0) {
                return true;
            }
            if (value < 0x09 || (value > 0x0D && value < 0x20)) {
                suspicious++;
            }
        }
        return sampleSize > 0 && suspicious * 10 > sampleSize;
    }

    private String extractExtension(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "";
        }
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
    }

    private SheetMatch findFirstEffectiveSheet(Workbook workbook, DataFormatter formatter, FormulaEvaluator evaluator) {
        for (int sheetIndex = 0; sheetIndex < workbook.getNumberOfSheets(); sheetIndex++) {
            Sheet sheet = workbook.getSheetAt(sheetIndex);
            int nonEmptyRowsSeen = 0;
            for (int rowIndex = sheet.getFirstRowNum(); rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                List<String> values = extractRowValues(row, formatter, evaluator);
                if (isBlankRecord(values)) {
                    continue;
                }

                nonEmptyRowsSeen++;
                int dateCol = findColumn(values, DATE_KEYWORDS);
                int weightCol = findColumn(values, WEIGHT_KEYWORDS);
                if (dateCol >= 0 && weightCol >= 0) {
                    return new SheetMatch(
                            sheetIndex,
                            sheet.getSheetName(),
                            rowIndex,
                            dateCol,
                            weightCol,
                            detectUnit(values.get(weightCol))
                    );
                }
                if (nonEmptyRowsSeen >= SHEET_HEADER_SCAN_LIMIT) {
                    break;
                }
            }
        }
        return null;
    }

    private int countNonEmptySheetRows(Sheet sheet, int startRowIndex, DataFormatter formatter, FormulaEvaluator evaluator) {
        int count = 0;
        for (int rowIndex = startRowIndex; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
            if (!isBlankRecord(extractRowValues(sheet.getRow(rowIndex), formatter, evaluator))) {
                count++;
            }
        }
        return count;
    }

    private List<String> extractRowValues(Row row, DataFormatter formatter, FormulaEvaluator evaluator) {
        if (row == null || row.getLastCellNum() < 0) {
            return List.of();
        }
        List<String> values = new ArrayList<>(row.getLastCellNum());
        for (int cellIndex = 0; cellIndex < row.getLastCellNum(); cellIndex++) {
            String value = getCellDisplayValue(row.getCell(cellIndex), formatter, evaluator);
            values.add(cellIndex == 0 ? stripBom(value) : value);
        }
        return values;
    }

    private String getCellDisplayValue(Cell cell, DataFormatter formatter, FormulaEvaluator evaluator) {
        if (cell == null) {
            return "";
        }
        return formatter.formatCellValue(cell, evaluator);
    }

    private WeightImportDateParser.ParseResult parseCellDate(Cell cell, String rawDate, FormulaEvaluator evaluator) {
        Double numericValue = extractNumericCellValue(cell, evaluator);
        if (numericValue != null && cell != null && DateUtil.isCellDateFormatted(cell)) {
            return new WeightImportDateParser.ParseResult(
                    DateUtil.getLocalDateTime(numericValue).toLocalDate(),
                    "Excel 日期单元格"
            );
        }
        return WeightImportDateParser.parse(rawDate);
    }

    private BigDecimal parseCellWeight(Cell cell, String rawWeight, FormulaEvaluator evaluator) {
        Double numericValue = extractNumericCellValue(cell, evaluator);
        if (numericValue != null) {
            return BigDecimal.valueOf(numericValue);
        }
        return parseWeightValue(rawWeight);
    }

    private Double extractNumericCellValue(Cell cell, FormulaEvaluator evaluator) {
        if (cell == null) {
            return null;
        }

        CellType cellType = cell.getCellType();
        if (cellType == CellType.NUMERIC) {
            return cell.getNumericCellValue();
        }
        if (cellType == CellType.FORMULA && evaluator != null) {
            CellValue cellValue = evaluator.evaluate(cell);
            if (cellValue != null && cellValue.getCellType() == CellType.NUMERIC) {
                return cellValue.getNumberValue();
            }
        }
        return null;
    }

    private void ensureRowLimit(int dataRowCount) {
        if (dataRowCount > MAX_IMPORT_ROWS) {
            throw new IllegalArgumentException("单次最多导入 1000 行，请拆分文件后重试");
        }
    }

    private char detectDelimiter(String line) {
        int commas = 0;
        int semicolons = 0;
        int tabs = 0;
        boolean inQuotes = false;
        for (char c : line.toCharArray()) {
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (!inQuotes) {
                if (c == ',') {
                    commas++;
                } else if (c == ';') {
                    semicolons++;
                } else if (c == '\t') {
                    tabs++;
                }
            }
        }
        if (tabs > 0 && tabs >= commas && tabs >= semicolons) {
            return '\t';
        }
        if (semicolons > 0 && semicolons >= commas) {
            return ';';
        }
        return ',';
    }

    private String delimiterName(char delimiter) {
        return switch (delimiter) {
            case '\t' -> "Tab";
            case ';' -> ";";
            default -> ",";
        };
    }

    private String findFirstNonEmptyLine(String content) {
        String[] lines = content.split("\\r?\\n", -1);
        for (String line : lines) {
            if (!line.trim().isEmpty()) {
                return line;
            }
        }
        return null;
    }

    private List<List<String>> parseCsvRecords(String content, char delimiter) {
        List<List<String>> records = new ArrayList<>();
        List<String> currentRecord = new ArrayList<>();
        StringBuilder currentField = new StringBuilder();
        boolean inQuotes = false;
        boolean sawAnyChar = false;

        for (int i = 0; i < content.length(); i++) {
            char c = content.charAt(i);
            sawAnyChar = true;
            if (c == '"') {
                if (inQuotes && i + 1 < content.length() && content.charAt(i + 1) == '"') {
                    currentField.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (inQuotes) {
                if (c == '\r') {
                    if (i + 1 < content.length() && content.charAt(i + 1) == '\n') {
                        i++;
                    }
                    currentField.append('\n');
                } else {
                    currentField.append(c);
                }
                continue;
            }

            if (c == delimiter) {
                currentRecord.add(currentField.toString());
                currentField = new StringBuilder();
                continue;
            }

            if (c == '\n' || c == '\r') {
                currentRecord.add(currentField.toString());
                records.add(currentRecord);
                currentRecord = new ArrayList<>();
                currentField = new StringBuilder();
                if (c == '\r' && i + 1 < content.length() && content.charAt(i + 1) == '\n') {
                    i++;
                }
                continue;
            }

            currentField.append(c);
        }

        if (inQuotes) {
            throw new IllegalArgumentException("CSV 格式错误：存在未闭合的引号");
        }
        if (!sawAnyChar) {
            return records;
        }
        if (currentField.length() > 0 || !currentRecord.isEmpty()) {
            currentRecord.add(currentField.toString());
            records.add(currentRecord);
        }
        return records;
    }

    private int findFirstNonEmptyRecordIndex(List<List<String>> records) {
        for (int i = 0; i < records.size(); i++) {
            if (!isBlankRecord(records.get(i))) {
                return i;
            }
        }
        return -1;
    }

    private int countNonEmptyRecords(List<List<String>> records, int startIndex) {
        int count = 0;
        for (int i = startIndex; i < records.size(); i++) {
            if (!isBlankRecord(records.get(i))) {
                count++;
            }
        }
        return count;
    }

    private boolean isBlankRecord(List<String> record) {
        for (String field : record) {
            if (field != null && !field.trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private List<String> sanitizeRecord(List<String> record) {
        List<String> sanitized = new ArrayList<>(record.size());
        for (int i = 0; i < record.size(); i++) {
            String value = record.get(i);
            sanitized.add(i == 0 ? stripBom(value) : value);
        }
        return sanitized;
    }

    private String stripBom(String value) {
        if (value != null && !value.isEmpty() && value.charAt(0) == '\uFEFF') {
            return value.substring(1);
        }
        return value;
    }

    private String decodeBytesToString(byte[] bytes) {
        if (bytes.length >= 3
                && (bytes[0] & 0xFF) == 0xEF
                && (bytes[1] & 0xFF) == 0xBB
                && (bytes[2] & 0xFF) == 0xBF) {
            return new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);
        }
        if (bytes.length >= 2
                && (bytes[0] & 0xFF) == 0xFF
                && (bytes[1] & 0xFF) == 0xFE) {
            return new String(bytes, 2, bytes.length - 2, StandardCharsets.UTF_16LE);
        }
        if (bytes.length >= 2
                && (bytes[0] & 0xFF) == 0xFE
                && (bytes[1] & 0xFF) == 0xFF) {
            return new String(bytes, 2, bytes.length - 2, StandardCharsets.UTF_16BE);
        }
        if (isValidUtf8(bytes)) {
            return new String(bytes, StandardCharsets.UTF_8);
        }
        return new String(bytes, Charset.forName("GB18030"));
    }

    private boolean isValidUtf8(byte[] bytes) {
        int i = 0;
        while (i < bytes.length) {
            int b = bytes[i] & 0xFF;
            if (b < 0x80) {
                i++;
            } else if ((b >> 5) == 0x6) {
                if (i + 1 >= bytes.length || (bytes[i + 1] & 0xC0) != 0x80) {
                    return false;
                }
                i += 2;
            } else if ((b >> 4) == 0xE) {
                if (i + 2 >= bytes.length
                        || (bytes[i + 1] & 0xC0) != 0x80
                        || (bytes[i + 2] & 0xC0) != 0x80) {
                    return false;
                }
                i += 3;
            } else if ((b >> 3) == 0x1E) {
                if (i + 3 >= bytes.length
                        || (bytes[i + 1] & 0xC0) != 0x80
                        || (bytes[i + 2] & 0xC0) != 0x80
                        || (bytes[i + 3] & 0xC0) != 0x80) {
                    return false;
                }
                i += 4;
            } else {
                return false;
            }
        }
        return true;
    }

    private int findColumn(List<String> headers, List<String> keywords) {
        for (int i = 0; i < headers.size(); i++) {
            String normalized = normalizeHeader(headers.get(i));
            for (String keyword : keywords) {
                if (normalized.contains(keyword.toLowerCase(Locale.ROOT))) {
                    return i;
                }
            }
        }
        return -1;
    }

    private String normalizeHeader(String header) {
        return header == null ? "" : header.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private String detectUnit(String weightHeader) {
        String normalizedHeader = normalizeHeader(weightHeader);
        if (normalizedHeader.contains("斤")) {
            return "斤";
        }
        if (normalizedHeader.contains("lbs") || normalizedHeader.contains("磅")) {
            return "lbs";
        }
        return "kg";
    }

    private BigDecimal convertToKg(BigDecimal value, String unit) {
        return switch (unit) {
            case "斤" -> value.divide(JIN_TO_KG_FACTOR, 2, RoundingMode.HALF_UP);
            case "lbs" -> value.multiply(LBS_TO_KG_FACTOR).setScale(2, RoundingMode.HALF_UP);
            default -> value.setScale(2, RoundingMode.HALF_UP);
        };
    }

    private BigDecimal parseWeightValue(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        String cleaned = raw.trim()
                .replaceAll("[^0-9.,\\-]", "")
                .replaceAll(",", ".");
        if (cleaned.isEmpty() || cleaned.equals("-") || cleaned.equals(".")) {
            return null;
        }
        try {
            BigDecimal value = new BigDecimal(cleaned);
            return value.compareTo(BigDecimal.ZERO) > 0 ? value : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private void syncCurrentWeight(Long userId, BigDecimal weightKg) {
        UserProfile user = userProfileRepository.findById(userId).orElse(null);
        if (user == null) {
            return;
        }
        user.setCurrentWeight(weightKg);
        refreshSmartGoalSnapshot(user);
        userProfileRepository.update(user);
    }

    private void refreshSmartGoalSnapshot(UserProfile user) {
        if (user.resolveGoalCalorieStrategy() != GoalCalorieStrategy.SMART) {
            return;
        }
        try {
            GoalPlanPreviewResponse preview = goalPlanningService.preview(new GoalPlanningService.GoalPlanningProfile(
                    user.getId(),
                    user.getGender(),
                    user.getBirthDate(),
                    user.getHeight(),
                    user.getCurrentWeight(),
                    user.getTargetWeight(),
                    user.getCustomBmr(),
                    user.getCustomTdee(),
                    user.getDailyCalorieTarget(),
                    user.getGoalMode(),
                    user.getGoalCalorieDelta(),
                    user.getDailyCalorieTarget(),
                    user.getGoalMode(),
                    user.getGoalCalorieDelta(),
                    user.getGoalTargetDate(),
                    user.resolveGoalCalorieStrategy()
            ));
            user.setDailyCalorieTarget(preview.recommendedDailyCalorieTarget());
            user.setGoalMode(preview.goalMode());
            user.setGoalCalorieDelta(preview.recommendedGoalCalorieDelta());
        } catch (IllegalArgumentException ignored) {
        }
    }

    private enum ImportFileType {
        CSV,
        XLSX
    }

    private record UploadedFile(String fileName, byte[] bytes, String textContent) {
    }

    private record PreviewStats(
            int totalRows,
            int parsedRows,
            int skippedRows,
            String detectedDateFormat,
            List<WeightImportPreviewRow> rows
    ) {
    }

    private record PreviewEvaluation(WeightImportPreviewRow row, String detectedDateFormat) {
    }

    private record SheetMatch(
            int sheetIndex,
            String sheetName,
            int headerRowIndex,
            int dateCol,
            int weightCol,
            String detectedUnit
    ) {
    }
}
