# 心栖轻食后端服务

这是 `心栖轻食` 小程序配套的后端服务，用于支持微信登录建档、食物查询、饮食记录和进度统计等功能。

## 运行前准备

请先确认本机已安装并启动：

- Java 17
- Maven
- MySQL 8

## 配置说明

- 公共配置：`src/main/resources/application.yml`
- 开发环境配置：`src/main/resources/application-dev.yml`
- 生产环境配置：`src/main/resources/application-prod.yml`

默认激活 `dev` 环境，且 `dev` 中已开启微信登录 mock：`wechat.mock-enabled=true`。

## 快速启动

1. 执行数据库初始化脚本：[`scripts/mysql-init.sql`](/D:/IdeaProjects/diet/scripts/mysql-init.sql)
2. 启动开发环境：`mvn spring-boot:run`
3. 启动生产环境：`mvn spring-boot:run -Dspring-boot.run.profiles=prod`
4. 服务默认地址：`http://localhost:8080`

## 登录与鉴权

- 小程序启动后会调用 `/api/auth/wechat/login` 完成登录并自动创建用户。
- 登录成功后，业务请求通过 `Authorization: Bearer {accessToken}` 传递身份。

## 食物冷启动数据

- 项目内置 `src/main/resources/builtin_food_seed.sql`。
- 启动时若食物库少于 300 条，将自动导入并 upsert 内置食物数据。
- 生成脚本：`scripts/generate-builtin-food-seed.ps1`。

## 联调说明

- 微信小程序工程目录：[`miniprogram`](/D:/IdeaProjects/diet/miniprogram)
- 小程序开发时默认请求后端本地地址 `http://127.0.0.1:8080`
- 真机调试时需改为电脑可访问的局域网 IP，而不是 `127.0.0.1`

## 相关文档

- 小程序接口说明：[`docs/miniprogram-api.md`](/D:/IdeaProjects/diet/docs/miniprogram-api.md)
- 小程序工程说明：[`miniprogram/README.md`](/D:/IdeaProjects/diet/miniprogram/README.md)
