# AGENTS.md

本文件用于约束本仓库内的代码生成、重构和维护行为。

## 1. 项目概况

- 仓库结构：双应用单仓
- 后端：`backend/`，Spring Boot 3 + MyBatis-Plus + MySQL
- 小程序：`miniprogram/`
- Java 版本：17
- 构建工具：Maven

## 2. 通用原则

- 优先做最小、可验证的改动。
- 先阅读现有实现，再做修改，不凭空假设。
- 代码注释、文档说明、必要日志文案优先使用中文，除非英文术语更准确或框架约定必须使用英文。
- Git commit 提交说明优先使用中文，要求简洁、直接、能说明改动目的。

## 3. 后端开发规范

- 保持清晰分层：`controller`、`service`、`repository`、`dto`、`common`。
- 不把业务逻辑堆到 Controller，Controller 只负责参数接收、调用 Service、返回统一响应。
- 接口继续沿用当前 `ApiResponse<T>` 返回结构。
- 请求和响应对象优先独立定义，不直接暴露实体类给前端。
- 列表接口返回对象，不返回裸数组。
- Controller 层新增或修改接口时，补充 Swagger/OpenAPI 注解，至少覆盖类说明、接口说明和关键参数说明。

## 4. MyBatis-Plus 与实体规范

- SQL 优先使用 XML Mapper，不优先使用注解 SQL。
- 复杂查询、动态条件、统计聚合、联表查询必须放到 XML 中。
- Mapper 接口保持简洁，SQL 细节放在对应 XML 文件。
- Mapper 与 XML 命名保持一致，并放在清晰的对应目录中。
- 实体类、DTO、VO 优先使用 Lombok 注解减少样板代码，常用：`@Data`、`@Getter`、`@Setter`、`@Builder`、`@NoArgsConstructor`、`@AllArgsConstructor`。
- 实体类字段之间保留空行，结构保持清晰；如 Lombok 会影响可读性或框架行为，则显式编写必要方法。

## 5. 数据库规范

- 表结构变更一律通过 Flyway 版本化迁移实现，禁止把建表、改表、补列、删列逻辑写到 `DataInitializer` 或其他运行时代码里。
- 新增或调整表结构时，优先新增 `backend/src/main/resources/db/migration/V*.sql`，并保持 `backend/src/main/resources/schema.sql` 与最新基线一致。
- 同步检查 `backend/src/main/resources/schema.sql`、Flyway migration、初始化数据和前端调用。
- 生产环境以 MySQL 5.7 兼容为准，禁止依赖 MySQL 8 特性，如 `WITH` / CTE、窗口函数、函数索引、`JSON_TABLE`、`CHECK` 等。
- 禁止使用外键、存储过程、存储函数；关联完整性通过应用层校验与必要索引保证。
- 建表或改表时，显式确认字符集、排序规则、默认值写法和表选项均受 MySQL 5.7 支持。

## 6. 文档规范

- 根目录 `README.md` 面向仓库使用者，提供仓库结构、应用入口、常用命令和文档导航。
- `backend/README.md` 面向后端使用者，提供后端运行方式、数据库初始化、必要配置和部署入口。
- 详细技术设计、接口约定、开发说明放到根 `docs/`、`backend/docs/` 或 `miniprogram/docs/`。

## 7. 文件编码规范

- 新增或修改文本文件时，统一使用 UTF-8 编码。
- 中文 Markdown、配置文件、说明文档优先使用 UTF-8 with BOM，避免 Windows 环境乱码。
- 小程序 `js`、`wxml`、`wxss` 文件优先使用 UTF-8 without BOM，避免微信开发者工具编译报错。
- 修改已有文件前，先确认原始编码，避免混用编码。

## 8. 小程序协作规范

- 小程序配置集中放在 `miniprogram/utils/constants.js`。
- 修改接口字段时，同步检查 `miniprogram/services/` 与页面调用。
- 所有卡路里相关数据在前端展示时一律取整后显示；BMI 统一保留 1 位小数。
- 修改小程序文件时，禁止把中文文案改成英文占位或 `?`。
- 使用 `wx.showModal` 时，`confirmText` 必须控制在 4 个汉字以内，避免运行时报 `confirmText length should not larger than 4 Chinese characters`。
- 涉及中文内容的批量写入，优先使用 Node 脚本写文件，避免 PowerShell 终端编码导致乱码。
- 高频操作页面默认使用短文案，禁止主动添加教学式、解释式、提示过多的描述性文字。
- 普通微信小程序不得把 `ext.json` 作为运行时配置主方案；仅第三方平台代开发场景才允许使用 `ext.json` / `wx.getExtConfigSync()`。

## 9. 当前产品特例

- 首页餐次模块中，某个餐次当天无记录时，不展示该餐次卡片。
- 小程序弹窗关闭控件统一使用叉号图标，如 `✕`，禁止使用“关闭”等文字按钮。
- 图标禁止使用首字母或单字占位；若当前页面无法提供合适图标实现，必须先向用户说明并确认方案后再继续。
