package com.diet.infra.food;

import com.diet.api.food.NutritionLabelOcrPort;
import com.diet.api.food.NutritionLabelOcrRequest;
import com.diet.api.food.NutritionLabelOcrResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class TencentNutritionLabelOcrClient implements NutritionLabelOcrPort {

    private static final String HOST = "ocr.tencentcloudapi.com";

    private static final String SERVICE = "ocr";

    private static final String VERSION = "2018-11-19";

    private static final String CONTENT_TYPE = "application/json; charset=utf-8";

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd")
            .withZone(ZoneOffset.UTC);

    private final RestClient restClient;

    private final ObjectMapper objectMapper;

    private final String secretId;

    private final String secretKey;

    private final String region;

    private final boolean mockEnabled;

    public TencentNutritionLabelOcrClient(
            ObjectMapper objectMapper,
            @Value("${tencent.ocr.secret-id:}") String secretId,
            @Value("${tencent.ocr.secret-key:}") String secretKey,
            @Value("${tencent.ocr.region:ap-guangzhou}") String region,
            @Value("${tencent.ocr.mock-enabled:false}") boolean mockEnabled
    ) {
        this.restClient = RestClient.builder().baseUrl("https://" + HOST).build();
        this.objectMapper = objectMapper;
        this.secretId = secretId;
        this.secretKey = secretKey;
        this.region = region;
        this.mockEnabled = mockEnabled;
    }

    @Override
    public NutritionLabelOcrResult recognize(NutritionLabelOcrRequest request) {
        if (mockEnabled) {
            return buildMockResult();
        }
        ensureConfigured();

        Map<String, Object> payload = buildPayload(request);
        TableOcrResponse tableResponse = callTableOcr(payload);
        List<List<String>> tableRows = buildTableRows(tableResponse.tableDetections());
        List<String> mergedTextLines = new ArrayList<>(tableRows.stream()
                .map(row -> String.join(" ", row))
                .toList());
        List<String> enginesUsed = new ArrayList<>(List.of("TENCENT_TABLE_ACCURATE_OCR"));

        if (shouldFallback(tableRows, mergedTextLines)) {
            List<String> generalLines = callGeneralAccurateOcr(payload);
            mergedTextLines = mergeUniqueLines(mergedTextLines, generalLines);
            enginesUsed.add("TENCENT_GENERAL_ACCURATE_OCR");
        }

        return new NutritionLabelOcrResult(tableRows, mergedTextLines, enginesUsed);
    }

    private void ensureConfigured() {
        if (secretId == null || secretId.isBlank() || secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("腾讯云 OCR 未配置 secret-id / secret-key");
        }
    }

    private Map<String, Object> buildPayload(NutritionLabelOcrRequest request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        if (request.imageUrl() != null && !request.imageUrl().isBlank()) {
            payload.put("ImageUrl", request.imageUrl());
        }
        if (request.imageBase64() != null && !request.imageBase64().isBlank()) {
            payload.put("ImageBase64", request.imageBase64());
        }
        return payload;
    }

    private TableOcrResponse callTableOcr(Map<String, Object> payload) {
        JsonNode response = callTencentApi("RecognizeTableAccurateOCR", payload);
        JsonNode tableDetectionsNode = response.path("Response").path("TableDetections");
        List<TableDetection> tableDetections = new ArrayList<>();
        if (tableDetectionsNode.isArray()) {
            for (JsonNode tableDetectionNode : tableDetectionsNode) {
                List<TableCell> cells = new ArrayList<>();
                JsonNode cellsNode = tableDetectionNode.path("Cells");
                if (cellsNode.isArray()) {
                    for (JsonNode cellNode : cellsNode) {
                        cells.add(new TableCell(
                                cellNode.path("RowTl").asInt(-1),
                                cellNode.path("ColTl").asInt(-1),
                                cellNode.path("Text").asText(""),
                                cellNode.path("Confidence").asInt(0)
                        ));
                    }
                }
                tableDetections.add(new TableDetection(cells));
            }
        }
        return new TableOcrResponse(tableDetections);
    }

    private List<String> callGeneralAccurateOcr(Map<String, Object> payload) {
        JsonNode response = callTencentApi("GeneralAccurateOCR", payload);
        JsonNode textDetectionsNode = response.path("Response").path("TextDetections");
        List<String> textLines = new ArrayList<>();
        if (textDetectionsNode.isArray()) {
            for (JsonNode textDetectionNode : textDetectionsNode) {
                String line = textDetectionNode.path("DetectedText").asText("");
                if (!line.isBlank()) {
                    textLines.add(line.trim());
                }
            }
        }
        return textLines;
    }

    private JsonNode callTencentApi(String action, Map<String, Object> payload) {
        try {
            String requestBody = objectMapper.writeValueAsString(payload);
            long timestamp = Instant.now().getEpochSecond();
            String date = DATE_FORMATTER.format(Instant.ofEpochSecond(timestamp));
            String authorization = buildAuthorization(action, requestBody, timestamp, date);

            String responseBody = restClient.post()
                    .uri("/")
                    .headers(headers -> {
                        headers.set("Authorization", authorization);
                        headers.set("Content-Type", CONTENT_TYPE);
                        headers.set("Host", HOST);
                        headers.set("X-TC-Action", action);
                        headers.set("X-TC-Version", VERSION);
                        headers.set("X-TC-Timestamp", String.valueOf(timestamp));
                        headers.set("X-TC-Region", region);
                    })
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode errorNode = root.path("Response").path("Error");
            if (!errorNode.isMissingNode() && !errorNode.isNull() && errorNode.fieldNames().hasNext()) {
                String code = errorNode.path("Code").asText("UNKNOWN");
                String message = errorNode.path("Message").asText("unknown error");
                throw new IllegalArgumentException("腾讯云 OCR 调用失败: " + code + " - " + message);
            }
            return root;
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalStateException("腾讯云 OCR 调用失败", exception);
        }
    }

    private String buildAuthorization(String action, String requestBody, long timestamp, String date) {
        try {
            String canonicalHeaders = "content-type:" + CONTENT_TYPE + "\n"
                    + "host:" + HOST + "\n"
                    + "x-tc-action:" + action.toLowerCase(Locale.ROOT) + "\n";
            String signedHeaders = "content-type;host;x-tc-action";
            String hashedPayload = sha256Hex(requestBody);
            String canonicalRequest = "POST\n/\n\n" + canonicalHeaders + "\n" + signedHeaders + "\n" + hashedPayload;
            String credentialScope = date + "/" + SERVICE + "/tc3_request";
            String stringToSign = "TC3-HMAC-SHA256\n" + timestamp + "\n" + credentialScope + "\n" + sha256Hex(canonicalRequest);

            byte[] secretDate = hmacSha256(("TC3" + secretKey).getBytes(StandardCharsets.UTF_8), date);
            byte[] secretService = hmacSha256(secretDate, SERVICE);
            byte[] secretSigning = hmacSha256(secretService, "tc3_request");
            String signature = bytesToHex(hmacSha256(secretSigning, stringToSign));

            return "TC3-HMAC-SHA256 "
                    + "Credential=" + secretId + "/" + credentialScope + ", "
                    + "SignedHeaders=" + signedHeaders + ", "
                    + "Signature=" + signature;
        } catch (Exception exception) {
            throw new IllegalStateException("构建腾讯云 OCR 签名失败", exception);
        }
    }

    private List<List<String>> buildTableRows(List<TableDetection> tableDetections) {
        if (tableDetections == null || tableDetections.isEmpty()) {
            return List.of();
        }
        TreeMap<Integer, TreeMap<Integer, String>> rows = new TreeMap<>();
        for (TableDetection tableDetection : tableDetections) {
            if (tableDetection.cells() == null) {
                continue;
            }
            for (TableCell cell : tableDetection.cells()) {
                if (cell == null || cell.rowIndex() < 0 || cell.colIndex() < 0 || cell.text() == null || cell.text().isBlank()) {
                    continue;
                }
                rows.computeIfAbsent(cell.rowIndex(), key -> new TreeMap<>())
                        .putIfAbsent(cell.colIndex(), normalizeCellText(cell.text()));
            }
        }
        List<List<String>> tableRows = new ArrayList<>();
        for (Map<Integer, String> row : rows.values()) {
            List<String> values = row.values().stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(value -> !value.isEmpty())
                    .toList();
            if (!values.isEmpty()) {
                tableRows.add(values);
            }
        }
        return tableRows;
    }

    private boolean shouldFallback(List<List<String>> tableRows, List<String> mergedTextLines) {
        if (tableRows == null || tableRows.isEmpty()) {
            return true;
        }
        int nutritionKeywordCount = 0;
        for (String line : mergedTextLines) {
            if (line.contains("能量") || line.contains("热量") || line.contains("蛋白质") || line.contains("脂肪") || line.contains("碳水")) {
                nutritionKeywordCount++;
            }
        }
        return nutritionKeywordCount < 3;
    }

    private List<String> mergeUniqueLines(List<String> first, List<String> second) {
        LinkedHashSet<String> merged = new LinkedHashSet<>();
        if (first != null) {
            merged.addAll(first);
        }
        if (second != null) {
            merged.addAll(second.stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(text -> !text.isEmpty())
                    .toList());
        }
        return merged.stream().toList();
    }

    private String normalizeCellText(String text) {
        return text.replace('\n', ' ').replaceAll("\\s+", " ").trim();
    }

    private String sha256Hex(String value) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        return bytesToHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
    }

    private byte[] hmacSha256(byte[] key, String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, mac.getAlgorithm()));
        return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder builder = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) {
            String hex = Integer.toHexString(value & 0xff);
            if (hex.length() == 1) {
                builder.append('0');
            }
            builder.append(hex);
        }
        return builder.toString();
    }

    private NutritionLabelOcrResult buildMockResult() {
        List<List<String>> rows = List.of(
                List.of("营养成分表", "每100克"),
                List.of("能量", "274kJ"),
                List.of("蛋白质", "3.5g"),
                List.of("脂肪", "2.8g"),
                List.of("碳水化合物", "6.0g"),
                List.of("食品名称", "无糖酸奶")
        );
        List<String> lines = rows.stream()
                .map(row -> String.join(" ", row))
                .toList();
        return new NutritionLabelOcrResult(rows, lines, List.of("MOCK_TENCENT_TABLE_ACCURATE_OCR"));
    }

    private record TableOcrResponse(
            List<TableDetection> tableDetections
    ) {
    }

    private record TableDetection(
            List<TableCell> cells
    ) {
    }

    private record TableCell(
            int rowIndex,
            int colIndex,
            String text,
            int confidence
    ) {
    }
}
