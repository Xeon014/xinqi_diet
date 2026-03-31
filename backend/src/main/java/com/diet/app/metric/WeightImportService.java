package com.diet.app.metric;

import com.diet.api.metric.DuplicatePolicy;
import com.diet.api.metric.WeightImportConfirmRequest;
import com.diet.api.metric.WeightImportConfirmRow;
import com.diet.api.metric.WeightImportPreviewRequest;
import com.diet.api.metric.WeightImportPreviewResponse;
import com.diet.api.metric.WeightImportPreviewRow;
import com.diet.api.metric.WeightImportResultResponse;
import com.diet.app.user.GoalPlanningService;
import com.diet.domain.metric.BodyMetricRecord;
import com.diet.domain.metric.BodyMetricRecordRepository;
import com.diet.domain.metric.BodyMetricType;
import com.diet.domain.metric.BodyMetricUnit;
import com.diet.domain.user.GoalCalorieStrategy;
import com.diet.domain.user.UserProfile;
import com.diet.domain.user.UserProfileRepository;
import com.diet.api.user.GoalPlanPreviewResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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

    private static final List<DateTimeFormatter> DATE_FORMATTERS = List.of(
            DateTimeFormatter.ISO_LOCAL_DATE,
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy/MM/dd"),
            DateTimeFormatter.ofPattern("yyyy/M/d"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("M/d/yyyy"),
            DateTimeFormatter.ofPattern("dd.MM.yyyy"),
            DateTimeFormatter.ofPattern("d.M.yyyy"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("d/M/yyyy")
    );

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
        String content = resolveFileContent(request);
        content = stripUtf8Bom(content);
        if (content == null || content.trim().isEmpty()) {
            throw new IllegalArgumentException("文件内容为空");
        }

        String headerLine = findFirstNonEmptyLine(content);
        if (headerLine == null) {
            throw new IllegalArgumentException("文件内容为空");
        }

        char delimiter = detectDelimiter(headerLine);
        String delimiterName = delimiterName(delimiter);
        List<List<String>> records = parseCsvRecords(content, delimiter);
        int headerIndex = findFirstNonEmptyRecordIndex(records);
        if (headerIndex < 0) {
            throw new IllegalArgumentException("文件内容为空");
        }
        int dataRowCount = countNonEmptyRecords(records, headerIndex + 1);
        if (dataRowCount > MAX_IMPORT_ROWS) {
            throw new IllegalArgumentException("单次最多导入 1000 行，请拆分文件后重试");
        }

        List<String> headers = sanitizeRecord(records.get(headerIndex));
        int dateCol = findColumn(headers, DATE_KEYWORDS);
        int weightCol = findColumn(headers, WEIGHT_KEYWORDS);

        if (dateCol < 0) {
            throw new IllegalArgumentException("未找到日期列，请确保表头中包含 date、时间 或 日期 等关键词");
        }
        if (weightCol < 0) {
            throw new IllegalArgumentException("未找到体重列，请确保表头中包含 weight、体重 或 body_mass 等关键词");
        }

        // Detect unit from weight column name
        String weightHeader = headers.get(weightCol).trim().toLowerCase();
        String detectedUnit = detectUnit(weightHeader);

        String detectedDateFormat = null;
        List<WeightImportPreviewRow> previewRows = new ArrayList<>();
        int totalRows = 0;
        int parsedRows = 0;
        int skippedRows = 0;

        for (int i = headerIndex + 1; i < records.size(); i++) {
            List<String> fields = sanitizeRecord(records.get(i));
            if (isBlankRecord(fields)) {
                continue;
            }
            totalRows++;

            String rawDate = fields.size() > dateCol ? fields.get(dateCol).trim() : "";
            String rawWeight = fields.size() > weightCol ? fields.get(weightCol).trim() : "";

            if (rawDate.isEmpty() && rawWeight.isEmpty()) {
                skippedRows++;
                previewRows.add(new WeightImportPreviewRow(rawDate, rawWeight, null, null, "空行"));
                continue;
            }

            LocalDate parsedDate = parseDate(rawDate);
            if (parsedDate != null && detectedDateFormat == null) {
                detectedDateFormat = detectDateFormat(rawDate);
            }

            BigDecimal rawWeightValue = parseWeightValue(rawWeight);
            if (parsedDate == null || rawWeightValue == null) {
                skippedRows++;
                String error = parsedDate == null ? "日期格式无法识别: " + rawDate : "体重数值无效: " + rawWeight;
                previewRows.add(new WeightImportPreviewRow(rawDate, rawWeight, null, null, error));
                continue;
            }

            // Convert to kg
            BigDecimal weightKg = convertToKg(rawWeightValue, detectedUnit);

            if (weightKg.compareTo(MIN_WEIGHT_KG) < 0 || weightKg.compareTo(MAX_WEIGHT_KG) > 0) {
                skippedRows++;
                previewRows.add(new WeightImportPreviewRow(rawDate, rawWeight, parsedDate, weightKg,
                        "体重超出合理范围 (" + MIN_WEIGHT_KG + " - " + MAX_WEIGHT_KG + " kg)"));
                continue;
            }

            if (parsedDate.isAfter(LocalDate.now())) {
                skippedRows++;
                previewRows.add(new WeightImportPreviewRow(rawDate, rawWeight, parsedDate, weightKg, "未来日期"));
                continue;
            }

            parsedRows++;
            previewRows.add(new WeightImportPreviewRow(rawDate, rawWeight, parsedDate, weightKg, null));
        }

        return new WeightImportPreviewResponse(
                request.fileName(),
                totalRows,
                parsedRows,
                skippedRows,
                delimiterName,
                detectedDateFormat,
                detectedUnit,
                previewRows
        );
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

    private char detectDelimiter(String line) {
        int commas = 0, semicolons = 0, tabs = 0;
        boolean inQuotes = false;
        for (char c : line.toCharArray()) {
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (!inQuotes) {
                if (c == ',') commas++;
                else if (c == ';') semicolons++;
                else if (c == '\t') tabs++;
            }
        }
        if (tabs > 0 && tabs >= commas && tabs >= semicolons) return '\t';
        if (semicolons > 0 && semicolons >= commas) return ';';
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
            } else {
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
            sanitized.add(i == 0 ? stripUtf8Bom(value) : value);
        }
        return sanitized;
    }

    private String stripUtf8Bom(String value) {
        if (value != null && !value.isEmpty() && value.charAt(0) == '\uFEFF') {
            return value.substring(1);
        }
        return value;
    }

    private String resolveFileContent(WeightImportPreviewRequest request) {
        if (request.fileBase64() != null && !request.fileBase64().isBlank()) {
            byte[] bytes = Base64.getDecoder().decode(request.fileBase64());
            return decodeBytesToString(bytes);
        }
        return request.fileContent();
    }

    private String decodeBytesToString(byte[] bytes) {
        // Check UTF-8 BOM
        if (bytes.length >= 3
                && (bytes[0] & 0xFF) == 0xEF
                && (bytes[1] & 0xFF) == 0xBB
                && (bytes[2] & 0xFF) == 0xBF) {
            return new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);
        }
        // Try UTF-8: if valid, use it
        if (isValidUtf8(bytes)) {
            return new String(bytes, StandardCharsets.UTF_8);
        }
        // Fallback to GBK (common for Chinese CSV exports)
        return new String(bytes, Charset.forName("GBK"));
    }

    private boolean isValidUtf8(byte[] bytes) {
        int i = 0;
        while (i < bytes.length) {
            int b = bytes[i] & 0xFF;
            if (b < 0x80) {
                i++;
            } else if ((b >> 5) == 0x6) {
                if (i + 1 >= bytes.length || (bytes[i + 1] & 0xC0) != 0x80) return false;
                i += 2;
            } else if ((b >> 4) == 0xE) {
                if (i + 2 >= bytes.length
                        || (bytes[i + 1] & 0xC0) != 0x80
                        || (bytes[i + 2] & 0xC0) != 0x80) return false;
                i += 3;
            } else if ((b >> 3) == 0x1E) {
                if (i + 3 >= bytes.length
                        || (bytes[i + 1] & 0xC0) != 0x80
                        || (bytes[i + 2] & 0xC0) != 0x80
                        || (bytes[i + 3] & 0xC0) != 0x80) return false;
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
                if (normalized.contains(keyword.toLowerCase())) {
                    return i;
                }
            }
        }
        return -1;
    }

    private String normalizeHeader(String header) {
        return header.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    private String detectUnit(String weightHeader) {
        if (weightHeader.contains("斤")) {
            return "斤";
        }
        if (weightHeader.contains("lbs") || weightHeader.contains("磅")) {
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

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        String trimmed = raw.trim();

        // Try ISO date-time first (has 'T')
        if (trimmed.contains("T")) {
            try {
                return LocalDateTime.parse(trimmed, DateTimeFormatter.ISO_LOCAL_DATE_TIME).toLocalDate();
            } catch (DateTimeParseException ignored) {
            }
            // Try without timezone offset
            int tIndex = trimmed.indexOf('T');
            String datePart = trimmed.substring(0, tIndex);
            try {
                return LocalDate.parse(datePart);
            } catch (DateTimeParseException ignored) {
            }
        }

        // Try date-only formats
        for (DateTimeFormatter formatter : DATE_FORMATTERS) {
            try {
                if (formatter == DateTimeFormatter.ISO_LOCAL_DATE || trimmed.contains("T")) {
                    continue;
                }
                return LocalDate.parse(trimmed, formatter);
            } catch (DateTimeParseException ignored) {
            }
        }

        // Try ISO_LOCAL_DATE directly as fallback
        try {
            return LocalDate.parse(trimmed);
        } catch (DateTimeParseException ignored) {
        }

        return null;
    }

    private String detectDateFormat(String rawDate) {
        if (rawDate == null || rawDate.trim().isEmpty()) {
            return null;
        }
        String trimmed = rawDate.trim();
        if (trimmed.contains("T")) {
            return "yyyy-MM-dd'T'HH:mm:ss";
        }
        if (trimmed.contains("-")) {
            return "yyyy-MM-dd";
        }
        if (trimmed.contains("/")) {
            return "yyyy/MM/dd";
        }
        if (trimmed.contains(".")) {
            return "dd.MM.yyyy";
        }
        return "unknown";
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
}
