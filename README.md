# 心栖轻食后端服务

这是 `心栖轻食` 小程序配套的后端服务，用于支持用户资料、食物查询、饮食记录和基础进度统计等功能。

## 运行前准备

请先确认本机已安装并启动：

- Java 17
- Maven
- MySQL 8

## 快速启动

1. 执行数据库初始化脚本：[`scripts/mysql-init.sql`](/D:/IdeaProjects/diet/scripts/mysql-init.sql)
2. 启动后端服务：`mvn spring-boot:run`
3. 服务默认地址：`http://localhost:8080`

## 联调说明

- 微信小程序工程目录：[`miniprogram`](/D:/IdeaProjects/diet/miniprogram)
- 小程序开发时默认请求后端本地地址 `http://127.0.0.1:8080`
- 真机调试时需改为电脑可访问的局域网 IP，而不是 `127.0.0.1`

## 相关文档

- 小程序接口说明：[`docs/miniprogram-api.md`](/D:/IdeaProjects/diet/docs/miniprogram-api.md)
- 小程序工程说明：[`miniprogram/README.md`](/D:/IdeaProjects/diet/miniprogram/README.md)