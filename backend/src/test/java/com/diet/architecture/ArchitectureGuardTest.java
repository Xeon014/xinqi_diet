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
    void controllerShouldNotDependOnMapperOrRepository() throws IOException {
        List<String> violations = findViolations(
                MAIN_SOURCE_ROOT.resolve("controller"),
                List.of(
                        "import com.diet.mapper.",
                        "import com.diet.repository.",
                        "Repository;"
                )
        );

        assertThat(violations)
                .as("Controller 不应直接依赖 mapper 或 repository")
                .isEmpty();
    }

    @Test
    void serviceShouldNotImportMapper() throws IOException {
        List<String> violations = findViolations(
                MAIN_SOURCE_ROOT.resolve("service"),
                List.of("import com.diet.mapper.")
        );

        assertThat(violations)
                .as("Service 不应直接依赖 mapper")
                .isEmpty();
    }

    @Test
    void sourceShouldNotImportRemovedUserPackage() throws IOException {
        List<String> violations = findViolations(
                MAIN_SOURCE_ROOT,
                List.of("import com.diet.user.")
        );

        assertThat(violations)
                .as("主源码不应继续引用已废弃的 com.diet.user 包")
                .isEmpty();
    }

    @Test
    void controllerShouldNotDependOnCompatibilityFacadeService() throws IOException {
        List<String> violations = findViolations(
                MAIN_SOURCE_ROOT.resolve("controller"),
                List.of(
                        "import com.diet.service.UserProfileService;",
                        "import com.diet.service.MealRecordService;",
                        "import com.diet.service.ExerciseRecordService;"
                )
        );

        assertThat(violations)
                .as("Controller 不应再回退依赖兼容层 service")
                .isEmpty();
    }

    @Test
    void mainSourceShouldNotDependOnRemovedCompatibilityService() throws IOException {
        List<String> violations = findViolations(
                MAIN_SOURCE_ROOT,
                List.of(
                        "import com.diet.service.UserProfileService;",
                        "import com.diet.service.MealRecordService;",
                        "import com.diet.service.ExerciseRecordService;"
                )
        );

        assertThat(violations)
                .as("主源码不应继续引用已删除的兼容层 service")
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

    private Stream<String> readLines(Path path) {
        try {
            return Files.readAllLines(path, StandardCharsets.UTF_8).stream();
        } catch (IOException exception) {
            throw new IllegalStateException("读取源码失败: " + path, exception);
        }
    }
}
