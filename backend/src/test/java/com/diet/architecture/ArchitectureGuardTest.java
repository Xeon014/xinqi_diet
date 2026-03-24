package com.diet.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

class ArchitectureGuardTest {

    private static final Path MAIN_SOURCE_ROOT = Path.of("src/main/java/com/diet");

    @Test
    void controllerShouldStayInSingleTriggerDirectory() throws IOException {
        List<String> violations = findControllerOutside(MAIN_SOURCE_ROOT.resolve("trigger/controller"), MAIN_SOURCE_ROOT.resolve("trigger"));

        assertThat(violations)
                .as("所有 Controller 都应收敛到 trigger/controller 目录")
                .isEmpty();
    }

    @Test
    void triggerShouldNotDependOnInfraImplementations() throws IOException {
        List<String> violations = findViolations(
                MAIN_SOURCE_ROOT.resolve("trigger"),
                List.of("import com.diet.infra.")
        );

        assertThat(violations)
                .as("trigger 层不应直接依赖 infra 实现")
                .isEmpty();
    }

    @Test
    void appShouldNotDependOnInfraImplementations() throws IOException {
        List<String> violations = findViolations(
                MAIN_SOURCE_ROOT.resolve("app"),
                List.of("import com.diet.infra.")
        );

        assertThat(violations)
                .as("app 层不应直接依赖 infra 实现")
                .isEmpty();
    }

    @Test
    void apiShouldNotDependOnAppInfraOrTrigger() throws IOException {
        List<String> violations = findViolations(
                MAIN_SOURCE_ROOT.resolve("api"),
                List.of(
                        "import com.diet.app.",
                        "import com.diet.infra.",
                        "import com.diet.trigger."
                )
        );

        assertThat(violations)
                .as("api 层不应反向依赖 app、infra 或 trigger")
                .isEmpty();
    }

    @Test
    void domainShouldRemainPure() throws IOException {
        List<String> violations = findViolations(
                MAIN_SOURCE_ROOT.resolve("domain"),
                List.of(
                        "import org.springframework.",
                        "import org.mybatis.",
                        "import jakarta.servlet.",
                        "import com.diet.app.",
                        "import com.diet.infra.",
                        "import com.diet.trigger."
                )
        );

        assertThat(violations)
                .as("domain 层应保持纯净，不依赖 Spring、MyBatis、Servlet 或上层实现")
                .isEmpty();
    }

    @Test
    void typesShouldOnlyContainCommonPackage() throws IOException {
        List<String> violations = findFilesOutside(MAIN_SOURCE_ROOT.resolve("types/common"), MAIN_SOURCE_ROOT.resolve("types"));

        assertThat(violations)
                .as("types 层只保留 common 等公共类型")
                .isEmpty();
    }

    @Test
    void typesShouldNotDependOnTriggerAppOrInfra() throws IOException {
        List<String> violations = findViolations(
                MAIN_SOURCE_ROOT.resolve("types"),
                List.of(
                        "import com.diet.trigger.",
                        "import com.diet.app.",
                        "import com.diet.infra.",
                        "import com.diet.api."
                )
        );

        assertThat(violations)
                .as("types 层不应反向依赖 trigger、app、infra 或 api")
                .isEmpty();
    }

    @Test
    void sourceShouldNotImportLegacyHorizontalPackages() throws IOException {
        List<String> violations = findViolations(
                MAIN_SOURCE_ROOT,
                List.of(
                        "import com.diet.auth.",
                        "import com.diet.common.",
                        "import com.diet.config.",
                        "import com.diet.controller.",
                        "import com.diet.dto.",
                        "import com.diet.mapper.",
                        "import com.diet.repository.",
                        "import com.diet.service.",
                        "import com.diet.user."
                )
        );

        assertThat(violations)
                .as("主源码不应继续引用旧的横向分层包")
                .isEmpty();
    }

    private List<String> findViolations(Path root, List<String> forbiddenSnippets) throws IOException {
        if (Files.notExists(root)) {
            return List.of();
        }

        try (Stream<Path> stream = Files.walk(root)) {
            return stream
                    .filter(path -> path.toString().endsWith(".java"))
                    .flatMap(path -> readLines(path)
                            .filter(line -> forbiddenSnippets.stream().anyMatch(line::contains))
                            .map(line -> path + " -> " + line.trim()))
                    .toList();
        }
    }

    private List<String> findControllerOutside(Path allowedRoot, Path scanRoot) throws IOException {
        if (Files.notExists(scanRoot)) {
            return List.of();
        }
        try (Stream<Path> stream = Files.walk(scanRoot)) {
            return stream
                    .filter(path -> path.toString().endsWith("Controller.java"))
                    .filter(path -> !path.startsWith(allowedRoot))
                    .map(Path::toString)
                    .toList();
        }
    }

    private List<String> findFilesOutside(Path allowedRoot, Path scanRoot) throws IOException {
        if (Files.notExists(scanRoot)) {
            return List.of();
        }
        try (Stream<Path> stream = Files.walk(scanRoot)) {
            return stream
                    .filter(path -> path.toString().endsWith(".java"))
                    .filter(path -> !path.startsWith(allowedRoot))
                    .map(Path::toString)
                    .toList();
        }
    }

    private Stream<String> readLines(Path path) {
        try {
            return Files.readAllLines(path, StandardCharsets.UTF_8).stream();
        } catch (IOException exception) {
            throw new IllegalStateException("读取源码失败: " + path, exception);
        }
    }
}
