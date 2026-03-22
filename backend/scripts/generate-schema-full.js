const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SCHEMA_PATH = path.join(ROOT, "src", "main", "resources", "schema.sql");
const OUTPUT_PATH = path.join(ROOT, "scripts", "sql", "schema-full-latest.sql");

const HEADER = [
  "CREATE DATABASE IF NOT EXISTS diet DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;",
  "USE diet;",
  ""
].join("\n");

const FLYWAY_BASELINE = [
  "",
  "CREATE TABLE IF NOT EXISTS flyway_schema_history (",
  "    installed_rank INT NOT NULL,",
  "    version VARCHAR(50) DEFAULT NULL,",
  "    description VARCHAR(200) NOT NULL,",
  "    type VARCHAR(20) NOT NULL,",
  "    script VARCHAR(1000) NOT NULL,",
  "    checksum INT DEFAULT NULL,",
  "    installed_by VARCHAR(100) NOT NULL,",
  "    installed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,",
  "    execution_time INT NOT NULL,",
  "    success TINYINT(1) NOT NULL,",
  "    PRIMARY KEY (installed_rank),",
  "    KEY flyway_schema_history_s_idx (success)",
  ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;",
  "",
  "INSERT INTO flyway_schema_history (",
  "    installed_rank,",
  "    version,",
  "    description,",
  "    type,",
  "    script,",
  "    checksum,",
  "    installed_by,",
  "    execution_time,",
  "    success",
  ")",
  "SELECT",
  "    1,",
  "    '1',",
  "    '<< Flyway Baseline >>',",
  "    'BASELINE',",
  "    '<< Flyway Baseline >>',",
  "    NULL,",
  "    SUBSTRING_INDEX(USER(), '@', 1),",
  "    0,",
  "    1",
  "WHERE NOT EXISTS (",
  "    SELECT 1",
  "    FROM flyway_schema_history",
  "    WHERE version = '1'",
  "      AND success = 1",
  ");",
  ""
].join("\n");

function main() {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8").replace(/^\uFEFF/, "").trimEnd();
  const content = `${HEADER}${schema}${FLYWAY_BASELINE}`;

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `\uFEFF${content}`, "utf8");

  console.log(`Generated ${OUTPUT_PATH}`);
}

main();
