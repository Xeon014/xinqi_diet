# 开发接手指南（初稿）

> 适用于在另一台电脑继续本项目开发。

## 1. 环境要求

- Java 17
- Maven 3.9+
- MySQL 8+
- Node.js（用于小程序脚本校验）
- 微信开发者工具（小程序调试）

## 2. 仓库准备

1. 拉取代码并进入项目根目录。
2. 检查关键目录：
   - `src/main/java`（后端）
   - `src/main/resources`（配置与 SQL）
   - `miniprogram/`（小程序）
   - `docs/`（文档）

## 3. 后端启动

1. 初始化数据库（参照 `scripts/mysql-init.sql` 与 `src/main/resources/schema.sql`）。
2. 开发环境启动：
   - `mvn spring-boot:run`
3. 编译检查：
   - `mvn -q -DskipTests compile`

## 4. 小程序启动

1. 用微信开发者工具打开 `miniprogram/`。
2. 检查请求地址配置：
   - `miniprogram/utils/constants.js`
3. 若真机调试，确保后端地址不是 `127.0.0.1`，改为局域网可访问 IP。

## 5. 必跑校验

- 每次修改小程序后执行：
  - `node scripts/verify-miniprogram-files.js`
- 若校验失败，不要继续开发新功能，先修复编码/JSON问题。

## 6. 编码与文件注意事项

- 小程序文件（`js/wxml/wxss`）使用 UTF-8（无 BOM）。
- Java 源码使用 UTF-8（无 BOM），避免 `\ufeff` 编译错误。
- 中文文案保持中文，不用英文占位替代。

## 7. 推荐开发流程（高稳定）

1. 先看 `docs/feature-inventory.md`，确认目标功能编号。
2. 只改一个小功能。
3. 跑小程序校验 + 后端编译。
4. 手动回归相关页面。
5. 更新 `docs/change-log-next.md`。

## 8. 常见问题速查

- 小程序编译报 WXML 条件渲染错误：检查 `wx:if/wx:elif/wx:else` 链式写法。
- Java 编译报非法字符 `\ufeff`：检查文件 BOM，转 UTF-8 无 BOM。
- 页面中文乱码：优先检查文件编码与终端写入方式。
