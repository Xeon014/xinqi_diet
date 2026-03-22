# 数据库删库重建与 Flyway 基线

## 1. 适用场景

- 本地开发环境要删库重建
- 测试环境要从空库初始化到当前最新结构
- 正式环境首次初始化，且希望后续继续由 Flyway 管理增量表结构

## 2. 使用入口

- 数据库账号与权限初始化：`scripts/mysql-init.sql`
- 最新完整基线脚本：`scripts/sql/schema-full-latest.sql`
- 最新结构快照：`src/main/resources/schema.sql`
- 增量迁移目录：`src/main/resources/db/migration/`

## 3. 推荐流程

1. 如需重建，先手工删除旧库，或确认目标库为空。
2. 如需创建本地数据库账号，执行 `scripts/mysql-init.sql`。
3. 执行 `scripts/sql/schema-full-latest.sql`。
4. 手工执行 `scripts/sql/bootstrap-builtin-foods-latest.sql`。
5. 手工执行 `scripts/sql/bootstrap-builtin-exercises-latest.sql`。
6. 启动应用。
7. 后续新增表结构变更时，只新增新的 `V*.sql` Flyway migration。

## 4. 当前规则

- `schema-full-latest.sql` 会直接把数据库结构建立到当前最新版本。
- 该脚本会同时写入 `flyway_schema_history` 基线记录，当前基线版本是 `V1`。
- 当前仓库已将最新上线结构重置为新的 `V1`，后续版本从 `V2` 开始递增。
- 应用启动后，Flyway 不会再重复执行这份基线，只会继续执行后续新增版本。

## 5. 维护要求

每次新增或调整表结构时，需要同步维护这几处：

1. 新增一个新的 `src/main/resources/db/migration/V*.sql`
2. 更新 `src/main/resources/schema.sql`
3. 执行 `node scripts/generate-schema-full.js`，重新生成 `scripts/sql/schema-full-latest.sql`
4. 如果最新基线版本号变化，同步更新基线写入版本

## 6. 注意事项

- 当前仓库已经完成一次预发布重置，旧的 `V1` 到 `V8` 迁移链已被新的 `V1` 基线替代。
- `schema-full-latest.sql` 只用于空库初始化或删库重建，不用于在线库的增量升级。
- 在线库升级仍然只走 Flyway 新增 migration，不手工改表。
- 内置食物和内置运动都不再由应用启动自动导入，初始化和后续维护一律手工执行 SQL。
