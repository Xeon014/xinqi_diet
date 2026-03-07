# AGENTS.md

本文件用于约束本仓库内的代码生成、重构和维护行为。

## 项目概况

- 项目类型：Spring Boot 3 + MyBatis-Plus + MySQL，微信小程序前端位于 `miniprogram/`
- Java 版本：17
- 构建工具：Maven

## 总体原则

- 优先做最小、可验证的改动。
- 保持清晰分层：`controller`、`service`、`repository`、`dto`、`common`。
- 不把业务逻辑堆到 Controller。
- 先阅读现有实现，再做修改，不凭空假设。

## 语言与提交规范

- 代码注释、文档说明、必要的日志文案优先使用中文，除非英文术语更准确或框架约定必须使用英文。
- Git commit 提交说明优先使用中文，要求简洁、直接、能说明改动目的。
- 对外接口字段命名、SQL 关键字、框架注解属性等遵循既有技术约定，不因中文偏好强行改动。

## 文件编码规范

- 新增或修改文本文件时，统一使用 UTF-8 编码。
- 在当前 Windows 开发环境下，包含中文的 Markdown、配置文件、说明文档优先使用 UTF-8 with BOM，避免编辑器、终端或脚本工具误判编码导致乱码。
- 小程序 `js`、`wxml`、`wxss` 文件优先使用 UTF-8 without BOM，避免微信开发者工具编译报错。
- 修改已有文件前，先确认文件原始编码，避免混用编码。
- 如无明确理由，不要在同一仓库中混用 GBK、ANSI、UTF-8 without BOM 等多种文本编码。

## MyBatis-Plus 规范

- SQL 优先使用 XML Mapper，不优先使用注解 SQL。
- 复杂查询、动态条件、统计聚合、联表查询必须放到 XML 中。
- Mapper 接口保持简洁，SQL 细节放在对应 XML 文件。
- Mapper 与 XML 命名保持一致，并放在清晰的对应目录中。

## 实体与 DTO 规范

- 实体类、DTO、VO 优先使用 Lombok 注解，减少 getter/setter 等样板代码。
- 常用注解包括：`@Data`、`@Getter`、`@Setter`、`@Builder`、`@NoArgsConstructor`、`@AllArgsConstructor`。
- 实体类的属性定义之间保留一个空行，保持结构清晰，常量区与字段区也要显式分隔。
- 如 Lombok 会影响可读性或框架行为，则显式编写必要方法。

## Controller 与 Service 规范

- Controller 只负责参数接收、调用 Service、返回统一响应。
- 业务逻辑放在 Service 层。
- 接口继续沿用当前 `ApiResponse<T>` 返回结构。
- Controller 层新增或修改接口时，补充 Swagger/OpenAPI 注解，至少覆盖类说明、接口说明和关键参数说明。

## 接口与数据库规范

- 请求和响应对象优先独立定义，不直接暴露实体类给前端。
- 列表接口返回对象，不返回裸数组。
- 表结构调整时，同步检查 `schema.sql`、初始化数据和前端调用。

## README 规范

- `README.md` 面向项目使用者，优先提供项目介绍、运行方式、必要配置和常见使用说明。
- `README.md` 不承载过多实现细节、分层设计说明或大段接口细节。
- 详细技术设计、接口约定、开发说明应放到 `docs/` 或其他专门文档中。

## 前端协作规范

- 小程序配置集中放在 `miniprogram/utils/constants.js`。
- 修改接口字段时，同步检查 `miniprogram/services/` 与页面调用。