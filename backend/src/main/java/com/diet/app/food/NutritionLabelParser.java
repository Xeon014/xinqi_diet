package com.diet.app.food;

import com.diet.api.food.NutritionLabelBaseType;
import com.diet.api.food.NutritionLabelConfidenceLevel;
import com.diet.api.food.NutritionLabelOcrResult;
import com.diet.api.food.NutritionLabelRecognitionResponse;
import com.diet.domain.food.FoodQuantityUnit;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
class NutritionLabelParser {

    private static final BigDecimal KJ_PER_KCAL = new BigDecimal("4.184");

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    private static final Pattern VALUE_WITH_UNIT_PATTERN = Pattern.compile("(-?\\d+(?:\\.\\d+)?)\\s*([A-Za-z%\\u4e00-\\u9fa5]+)");

    private static final Pattern NAME_PATTERN = Pattern.compile("^(?:食品|产品)?名称[:：\\s]*(.+)$");

    private static final Pattern PER_100_G_PATTERN = Pattern.compile("每\\s*100\\s*(?:克|g|G)");

    private static final Pattern PER_100_ML_PATTERN = Pattern.compile("每\\s*100\\s*(?:毫升|ml|mL|ML)");

    private static final Pattern PER_SERVING_PATTERN = Pattern.compile("每\\s*份(?:\\s*[（(]?\\s*(\\d+(?:\\.\\d+)?)\\s*(克|g|G|毫升|ml|mL|ML)\\s*[)）]?)?");

    private static final Pattern NET_CONTENT_PATTERN = Pattern.compile("(?:净含量|规格)[:：\\s]*(\\d+(?:\\.\\d+)?)\\s*(千克|kg|KG|克|g|G|升|L|l|毫升|ml|mL|ML)");

    NutritionLabelRecognitionResponse parse(NutritionLabelOcrResult ocrResult) {
        List<String> lines = collectLines(ocrResult);
        BaseContext baseContext = detectBaseContext(lines);
        String foodName = detectFoodName(lines);
        NutrientValue energy = detectEnergy(lines);
        NutrientValue protein = detectMacro(lines, "蛋白质");
        NutrientValue carbs = detectMacro(lines, "碳水");
        NutrientValue fat = detectMacro(lines, "脂肪");

        BigDecimal normalizedCalories = normalizeEnergy(energy, baseContext);
        BigDecimal normalizedProtein = normalizeMacro(protein, baseContext);
        BigDecimal normalizedCarbs = normalizeMacro(carbs, baseContext);
        BigDecimal normalizedFat = normalizeMacro(fat, baseContext);

        FoodQuantityUnit normalizedUnit = resolveNormalizedUnit(baseContext);
        List<String> missingFields = resolveMissingFields(foodName, normalizedCalories, normalizedProtein, normalizedCarbs, normalizedFat, baseContext);
        NutritionLabelConfidenceLevel confidenceLevel = resolveConfidenceLevel(
                normalizedCalories,
                normalizedProtein,
                normalizedCarbs,
                normalizedFat,
                baseContext,
                missingFields
        );

        return new NutritionLabelRecognitionResponse(
                foodName,
                normalizedCalories,
                normalizedProtein,
                normalizedCarbs,
                normalizedFat,
                normalizedUnit,
                baseContext.baseType(),
                baseContext.baseText(),
                scale(baseContext.servingAmount()),
                baseContext.servingUnit(),
                confidenceLevel,
                missingFields,
                normalizeTextList(ocrResult.enginesUsed()),
                lines
        );
    }

    private List<String> collectLines(NutritionLabelOcrResult ocrResult) {
        LinkedHashSet<String> merged = new LinkedHashSet<>();
        if (ocrResult.tableRows() != null) {
            for (List<String> row : ocrResult.tableRows()) {
                String rowText = row == null ? "" : row.stream()
                        .filter(Objects::nonNull)
                        .map(String::trim)
                        .filter(text -> !text.isEmpty())
                        .reduce((left, right) -> left + " " + right)
                        .orElse("");
                if (!rowText.isBlank()) {
                    merged.add(rowText);
                }
            }
        }
        if (ocrResult.textLines() != null) {
            for (String line : ocrResult.textLines()) {
                if (line != null && !line.trim().isEmpty()) {
                    merged.add(line.trim());
                }
            }
        }
        return merged.stream().toList();
    }

    private String detectFoodName(List<String> lines) {
        for (String line : lines) {
            Matcher matcher = NAME_PATTERN.matcher(line);
            if (matcher.find()) {
                String value = matcher.group(1).trim();
                if (!value.isEmpty()) {
                    return value;
                }
            }
        }
        for (String line : lines) {
            if (containsNutritionKeyword(line)) {
                continue;
            }
            if (line.length() < 2 || line.length() > 24) {
                continue;
            }
            if (line.contains("%") || VALUE_WITH_UNIT_PATTERN.matcher(line).find()) {
                continue;
            }
            return line;
        }
        return null;
    }

    private BaseContext detectBaseContext(List<String> lines) {
        BigDecimal servingAmount = null;
        FoodQuantityUnit servingUnit = null;
        String baseText = null;

        for (String line : lines) {
            Matcher per100gMatcher = PER_100_G_PATTERN.matcher(line);
            if (per100gMatcher.find()) {
                return new BaseContext(NutritionLabelBaseType.PER_100_G, per100gMatcher.group(), null, null);
            }
            Matcher per100mlMatcher = PER_100_ML_PATTERN.matcher(line);
            if (per100mlMatcher.find()) {
                return new BaseContext(NutritionLabelBaseType.PER_100_ML, per100mlMatcher.group(), null, null);
            }

            Matcher servingMatcher = PER_SERVING_PATTERN.matcher(line);
            if (servingMatcher.find()) {
                baseText = servingMatcher.group();
                if (servingMatcher.group(1) != null && servingMatcher.group(2) != null) {
                    servingAmount = toDecimal(servingMatcher.group(1));
                    servingUnit = resolveQuantityUnit(servingMatcher.group(2));
                }
            }

            Matcher netContentMatcher = NET_CONTENT_PATTERN.matcher(line);
            if (netContentMatcher.find() && servingAmount == null && servingUnit == null) {
                servingAmount = normalizeNetAmount(netContentMatcher.group(1), netContentMatcher.group(2));
                servingUnit = resolveQuantityUnit(netContentMatcher.group(2));
            }
        }

        if (baseText != null) {
            return new BaseContext(NutritionLabelBaseType.PER_SERVING, baseText, servingAmount, servingUnit);
        }
        return new BaseContext(NutritionLabelBaseType.UNKNOWN, null, servingAmount, servingUnit);
    }

    private NutrientValue detectEnergy(List<String> lines) {
        for (String line : lines) {
            if (!containsAlias(line, "能量", "热量")) {
                continue;
            }
            String candidate = tailAfterAlias(line, "能量", "热量");
            Matcher matcher = VALUE_WITH_UNIT_PATTERN.matcher(candidate);
            while (matcher.find()) {
                BigDecimal value = toDecimal(matcher.group(1));
                String unit = matcher.group(2);
                if (value == null) {
                    continue;
                }
                if (isEnergyUnit(unit)) {
                    return new NutrientValue(value, unit, line);
                }
            }
        }
        return null;
    }

    private NutrientValue detectMacro(List<String> lines, String nutrientType) {
        for (String line : lines) {
            if (!matchesMacro(line, nutrientType)) {
                continue;
            }
            String candidate = tailAfterMacroAlias(line, nutrientType);
            Matcher matcher = VALUE_WITH_UNIT_PATTERN.matcher(candidate);
            while (matcher.find()) {
                BigDecimal value = toDecimal(matcher.group(1));
                String unit = matcher.group(2);
                if (value == null) {
                    continue;
                }
                if (isMacroUnit(unit)) {
                    return new NutrientValue(normalizeMacroUnit(value, unit), unit, line);
                }
            }
        }
        return null;
    }

    private BigDecimal normalizeEnergy(NutrientValue value, BaseContext baseContext) {
        if (value == null || value.value() == null) {
            return null;
        }
        BigDecimal normalized = isKjUnit(value.unit())
                ? value.value().divide(KJ_PER_KCAL, 2, RoundingMode.HALF_UP)
                : value.value();
        return scale(applyBaseNormalization(normalized, baseContext));
    }

    private BigDecimal normalizeMacro(NutrientValue value, BaseContext baseContext) {
        if (value == null || value.value() == null) {
            return null;
        }
        return scale(applyBaseNormalization(value.value(), baseContext));
    }

    private BigDecimal applyBaseNormalization(BigDecimal value, BaseContext baseContext) {
        if (value == null) {
            return null;
        }
        if (baseContext.baseType() == NutritionLabelBaseType.PER_100_G || baseContext.baseType() == NutritionLabelBaseType.PER_100_ML) {
            return value;
        }
        if (baseContext.baseType() == NutritionLabelBaseType.PER_SERVING
                && baseContext.servingAmount() != null
                && baseContext.servingAmount().compareTo(BigDecimal.ZERO) > 0
                && baseContext.servingUnit() != null) {
            return value.multiply(ONE_HUNDRED).divide(baseContext.servingAmount(), 4, RoundingMode.HALF_UP);
        }
        return null;
    }

    private FoodQuantityUnit resolveNormalizedUnit(BaseContext baseContext) {
        if (baseContext.baseType() == NutritionLabelBaseType.PER_100_G) {
            return FoodQuantityUnit.G;
        }
        if (baseContext.baseType() == NutritionLabelBaseType.PER_100_ML) {
            return FoodQuantityUnit.ML;
        }
        if (baseContext.baseType() == NutritionLabelBaseType.PER_SERVING) {
            return baseContext.servingUnit();
        }
        return null;
    }

    private List<String> resolveMissingFields(
            String foodName,
            BigDecimal calories,
            BigDecimal protein,
            BigDecimal carbs,
            BigDecimal fat,
            BaseContext baseContext
    ) {
        List<String> missing = new ArrayList<>();
        if (foodName == null || foodName.isBlank()) {
            missing.add("foodName");
        }
        if (baseContext.baseType() == NutritionLabelBaseType.UNKNOWN) {
            missing.add("nutritionBase");
        }
        if (calories == null) {
            missing.add("calories");
        }
        if (protein == null) {
            missing.add("protein");
        }
        if (carbs == null) {
            missing.add("carbs");
        }
        if (fat == null) {
            missing.add("fat");
        }
        return missing;
    }

    private NutritionLabelConfidenceLevel resolveConfidenceLevel(
            BigDecimal calories,
            BigDecimal protein,
            BigDecimal carbs,
            BigDecimal fat,
            BaseContext baseContext,
            List<String> missingFields
    ) {
        int presentCount = countPresent(calories, protein, carbs, fat);
        if (presentCount <= 1 || baseContext.baseType() == NutritionLabelBaseType.UNKNOWN) {
            return NutritionLabelConfidenceLevel.LOW;
        }
        if (isSeverelyAnomalous(calories, protein, carbs, fat)) {
            return NutritionLabelConfidenceLevel.LOW;
        }
        if (presentCount == 4 && missingFields.size() <= 1) {
            return NutritionLabelConfidenceLevel.HIGH;
        }
        return NutritionLabelConfidenceLevel.MEDIUM;
    }

    private int countPresent(BigDecimal... values) {
        int count = 0;
        for (BigDecimal value : values) {
            if (value != null) {
                count++;
            }
        }
        return count;
    }

    private boolean isSeverelyAnomalous(BigDecimal calories, BigDecimal protein, BigDecimal carbs, BigDecimal fat) {
        if (protein != null && protein.compareTo(new BigDecimal("100.50")) > 0) {
            return true;
        }
        if (carbs != null && carbs.compareTo(new BigDecimal("100.50")) > 0) {
            return true;
        }
        if (fat != null && fat.compareTo(new BigDecimal("100.50")) > 0) {
            return true;
        }
        if (protein != null && carbs != null && fat != null) {
            BigDecimal macroTotal = protein.add(carbs).add(fat);
            if (macroTotal.compareTo(new BigDecimal("110")) > 0) {
                return true;
            }
            if (calories != null && calories.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal estimatedCalories = protein.multiply(new BigDecimal("4"))
                        .add(carbs.multiply(new BigDecimal("4")))
                        .add(fat.multiply(new BigDecimal("9")));
                if (estimatedCalories.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal ratio = calories.divide(estimatedCalories, 4, RoundingMode.HALF_UP);
                    return ratio.compareTo(new BigDecimal("0.35")) < 0 || ratio.compareTo(new BigDecimal("1.80")) > 0;
                }
            }
        }
        return false;
    }

    private List<String> normalizeTextList(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) {
                normalized.add(value.trim());
            }
        }
        return normalized.stream().toList();
    }

    private boolean containsNutritionKeyword(String line) {
        return containsAlias(line, "营养成分表", "能量", "热量", "蛋白质", "脂肪", "碳水");
    }

    private boolean matchesMacro(String line, String nutrientType) {
        return switch (nutrientType) {
            case "蛋白质" -> containsAlias(line, "蛋白质");
            case "碳水" -> containsAlias(line, "碳水化合物", "碳水");
            case "脂肪" -> containsAlias(line, "脂肪");
            default -> false;
        };
    }

    private String tailAfterMacroAlias(String line, String nutrientType) {
        return switch (nutrientType) {
            case "蛋白质" -> tailAfterAlias(line, "蛋白质");
            case "碳水" -> tailAfterAlias(line, "碳水化合物", "碳水");
            case "脂肪" -> tailAfterAlias(line, "脂肪");
            default -> line;
        };
    }

    private String tailAfterAlias(String line, String... aliases) {
        for (String alias : aliases) {
            int index = line.indexOf(alias);
            if (index >= 0) {
                return line.substring(index + alias.length());
            }
        }
        return line;
    }

    private boolean containsAlias(String line, String... aliases) {
        for (String alias : aliases) {
            if (line.contains(alias)) {
                return true;
            }
        }
        return false;
    }

    private boolean isEnergyUnit(String unit) {
        String normalized = unit.toLowerCase(Locale.ROOT);
        return normalized.contains("kj")
                || normalized.contains("千焦")
                || normalized.contains("kcal")
                || normalized.contains("千卡")
                || "卡".equals(unit);
    }

    private boolean isKjUnit(String unit) {
        String normalized = unit.toLowerCase(Locale.ROOT);
        return normalized.contains("kj") || normalized.contains("千焦");
    }

    private boolean isMacroUnit(String unit) {
        String normalized = unit.toLowerCase(Locale.ROOT);
        return normalized.contains("g") || normalized.contains("克") || normalized.contains("mg") || normalized.contains("毫克");
    }

    private BigDecimal normalizeMacroUnit(BigDecimal value, String unit) {
        String normalized = unit.toLowerCase(Locale.ROOT);
        if (normalized.contains("mg") || normalized.contains("毫克")) {
            return value.divide(new BigDecimal("1000"), 4, RoundingMode.HALF_UP);
        }
        return value;
    }

    private BigDecimal normalizeNetAmount(String amountText, String unitText) {
        BigDecimal amount = toDecimal(amountText);
        if (amount == null) {
            return null;
        }
        String normalized = unitText.toLowerCase(Locale.ROOT);
        if (normalized.contains("kg") || normalized.contains("千克")) {
            return amount.multiply(new BigDecimal("1000"));
        }
        if ("l".equals(normalized) || normalized.contains("升")) {
            return amount.multiply(new BigDecimal("1000"));
        }
        return amount;
    }

    private FoodQuantityUnit resolveQuantityUnit(String unit) {
        if (unit == null || unit.isBlank()) {
            return null;
        }
        String normalized = unit.toLowerCase(Locale.ROOT);
        if (normalized.contains("ml") || normalized.contains("毫升") || normalized.equals("l") || normalized.contains("升")) {
            return FoodQuantityUnit.ML;
        }
        if (normalized.contains("g") || normalized.contains("克") || normalized.contains("kg") || normalized.contains("千克")) {
            return FoodQuantityUnit.G;
        }
        return null;
    }

    private BigDecimal toDecimal(String value) {
        try {
            return new BigDecimal(value);
        } catch (Exception exception) {
            return null;
        }
    }

    private BigDecimal scale(BigDecimal value) {
        if (value == null) {
            return null;
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private record BaseContext(
            NutritionLabelBaseType baseType,
            String baseText,
            BigDecimal servingAmount,
            FoodQuantityUnit servingUnit
    ) {
    }

    private record NutrientValue(
            BigDecimal value,
            String unit,
            String sourceLine
    ) {
    }
}
