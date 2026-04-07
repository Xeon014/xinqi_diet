# 心栖轻食后端服务

这是 `心栖轻食` 小程序配套的后端服务，用于支持微信登录建档、食物查询、饮食记录和进度统计等功能。

> 本文默认命令都在 `backend/` 目录下执行。

## 代码结构

后端包结构已调整为六层目录：

- `com.diet.trigger`：HTTP 触发层，不按业务域拆分；所有 Controller 收敛在 `com.diet.trigger.controller`
- `com.diet.app`：应用层，负责用例编排、事务边界、查询与命令服务
- `com.diet.domain`：领域层，包含实体、枚举、领域仓储接口与紧密相关的纯规则
- `com.diet.infra`：基础设施层，包含 MyBatis Mapper、Repository 实现、外部客户端与启动配置
- `com.diet.api`：接口契约层，包含 Controller 直接使用的 request/response DTO，以及跨层 Port
- `com.diet.types`：公共类型层，只保留 `common` 等通用返回、异常、常量

当前代码组织采用“先层后域”为主、`trigger/types` 例外的方式，例如：

- `com.diet.trigger.controller`
- `com.diet.app.record.meal`
- `com.diet.domain.metric`
- `com.diet.infra.food`
- `com.diet.api.user`
- `com.diet.types.common`

## 运行前准备

请先确认本机已安装并启动：

- Java 17
- Maven
- MySQL 5.7+（开发与生产都按 MySQL 5.7 兼容约束实现）

## 配置说明

- 公共配置：`src/main/resources/application.yml`
- 开发环境配置：`src/main/resources/application-dev.yml`
- 生产环境配置：`src/main/resources/application-prod.yml`

默认激活 `dev` 环境，且 `dev` 中已开启微信登录 mock：`wechat.mock-enabled=true`。
如需演示数据，必须显式追加 `demo-seed` profile，不再通过普通启动自动注入。
营养成分表识别依赖腾讯云 OCR，开发环境默认开启 `tencent.ocr.mock-enabled=true`；如需联调真实 OCR，请配置 `TENCENT_OCR_SECRET_ID`、`TENCENT_OCR_SECRET_KEY`，并关闭 mock。

## 快速启动

1. 如需初始化本地数据库账号与权限，执行：`scripts/mysql-init.sql`
2. 如需从空库或删库后重建到当前最新结构，执行：`scripts/sql/schema-full-latest.sql`
3. 启动开发环境：`mvn spring-boot:run`
4. 如需带演示数据启动：`mvn spring-boot:run -Dspring-boot.run.profiles=dev,demo-seed`
5. 启动生产环境：`mvn spring-boot:run -Dspring-boot.run.profiles=prod`
6. 服务默认地址：`http://localhost:8080`

## 自检命令

- 后端回归：`mvn -q test`
- 仓库串行校验：`cd .. && bash scripts/verify-project.sh`

## 数据库基线

- 最新完整建表基线：`scripts/sql/schema-full-latest.sql`
- 结构快照：`src/main/resources/schema.sql`
- 增量迁移目录：`src/main/resources/db/migration/`

说明：

1. `schema-full-latest.sql` 用于空库初始化或删库重建，脚本会把数据库结构直接建立到当前最新版本，并写入 Flyway 基线版本 `V1`。
2. 当前仓库中的最新上线结构已经重置为新的 `V1` 基线，后续表结构调整从 `V2` 开始新增。
3. `schema.sql` 继续作为仓库内的最新结构快照维护，但删库重建优先使用 `schema-full-latest.sql`。

## 登录与鉴权

- 小程序启动后会调用 `/api/auth/wechat/login` 完成登录并自动创建用户。
- 登录成功后，业务请求通过 `Authorization: Bearer {accessToken}` 传递身份。

## 内置食物手工导入

- 应用启动时**不会自动导入**内置食物。
- 原始营养源数据：`scripts/data/food_nutrition.csv`
- 精选清单：`scripts/data/builtin-food-selection.tsv`
- 当前发布清单：`scripts/data/builtin-food-manual.tsv`
- 生成脚本：`scripts/generate-builtin-food-seed.js`
- 首次初始化脚本：`scripts/sql/bootstrap-builtin-foods-latest.sql`
- 上线后同步脚本：`scripts/sql/sync-builtin-foods-latest.sql`

正式方案：

1. 维护 `builtin-food-selection.tsv` 与 `builtin-food-manual.tsv`
2. 执行 `node scripts/generate-builtin-food-seed.js`
3. 首次上线前，如需从空库或可重置环境初始化，执行 `bootstrap-builtin-foods-latest.sql`
4. 正式上线后，后续维护**只执行** `sync-builtin-foods-latest.sql`

重要约束：

- 正式上线后，不再使用“先删后插”的全量重建脚本。
- 内置食物以 `food.source_ref` 作为稳定身份；后续修改通过 `source_ref` 更新，不删除历史食物记录。

## 内置运动手工导入

- 应用启动时**不会自动导入**内置运动。
- 生成脚本：`scripts/generate-builtin-exercise-seed.ps1`
- 首次初始化脚本：`scripts/sql/bootstrap-builtin-exercises-latest.sql`
- 上线后同步脚本：`scripts/sql/sync-builtin-exercises-latest.sql`

正式方案：

1. 如需重新生成，执行 `scripts/generate-builtin-exercise-seed.ps1`
2. 首次上线前，如需从空库或可重置环境初始化，执行 `bootstrap-builtin-exercises-latest.sql`
3. 正式上线后，后续维护**只执行** `sync-builtin-exercises-latest.sql`

## 联调说明

- 微信小程序工程目录：`../miniprogram/`
- 小程序开发时默认请求后端本地地址 `http://127.0.0.1:8080`
- 真机调试时需改为电脑可访问的局域网 IP，而不是 `127.0.0.1`

## 相关文档

- 仓库文档总导航：`../docs/README.md`
- 小程序接口说明：`../docs/小程序接口对接说明.md`
- 小程序工程说明：`../miniprogram/README.md`
- 后端部署清单：`docs/腾讯云托管部署清单.md`
- 数据库与维护文档：`docs/数据库删库重建与 Flyway 基线.md`、`docs/内置食物初始化与维护方案.md`
