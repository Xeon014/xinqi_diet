package com.diet.app.metric;

import cn.hutool.core.date.DateException;
import cn.hutool.core.date.DateUtil;
import cn.hutool.core.date.LocalDateTimeUtil;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

final class WeightImportDateParser {

    private static final List<PatternCandidate> PATTERN_CANDIDATES = List.of(
            new PatternCandidate("yyyy-MM-dd'T'HH:mm:ss"),
            new PatternCandidate("yyyy-MM-dd'T'HH:mm"),
            new PatternCandidate("yyyy-MM-dd HH:mm:ss"),
            new PatternCandidate("yyyy-MM-dd HH:mm"),
            new PatternCandidate("yyyy/M/d H:mm:ss"),
            new PatternCandidate("yyyy/M/d H:mm"),
            new PatternCandidate("yyyy/MM/dd HH:mm:ss"),
            new PatternCandidate("yyyy/MM/dd HH:mm"),
            new PatternCandidate("M/d/yyyy H:mm:ss"),
            new PatternCandidate("M/d/yyyy H:mm"),
            new PatternCandidate("MM/dd/yyyy HH:mm:ss"),
            new PatternCandidate("MM/dd/yyyy HH:mm"),
            new PatternCandidate("d.M.yyyy H:mm:ss"),
            new PatternCandidate("d.M.yyyy H:mm"),
            new PatternCandidate("dd.MM.yyyy HH:mm:ss"),
            new PatternCandidate("dd.MM.yyyy HH:mm"),
            new PatternCandidate("d/M/yyyy H:mm:ss"),
            new PatternCandidate("d/M/yyyy H:mm"),
            new PatternCandidate("dd/MM/yyyy HH:mm:ss"),
            new PatternCandidate("dd/MM/yyyy HH:mm"),
            new PatternCandidate("yyyy-MM-dd"),
            new PatternCandidate("yyyy/M/d"),
            new PatternCandidate("yyyy/MM/dd"),
            new PatternCandidate("M/d/yyyy"),
            new PatternCandidate("MM/dd/yyyy"),
            new PatternCandidate("d.M.yyyy"),
            new PatternCandidate("dd.MM.yyyy"),
            new PatternCandidate("d/M/yyyy"),
            new PatternCandidate("dd/MM/yyyy")
    );

    private WeightImportDateParser() {
    }

    static ParseResult parse(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return ParseResult.empty();
        }
        String trimmed = raw.trim();
        for (PatternCandidate candidate : PATTERN_CANDIDATES) {
            try {
                LocalDateTime measuredAt = LocalDateTimeUtil.of(DateUtil.parse(trimmed, candidate.pattern()))
                        .truncatedTo(ChronoUnit.MINUTES);
                return new ParseResult(measuredAt, candidate.pattern());
            } catch (DateException ignored) {
            }
        }
        return ParseResult.empty();
    }

    record ParseResult(LocalDateTime measuredAt, String matchedPattern) {
        static ParseResult empty() {
            return new ParseResult(null, null);
        }

        LocalDate date() {
            return measuredAt == null ? null : measuredAt.toLocalDate();
        }
    }

    private record PatternCandidate(String pattern) {
    }
}
