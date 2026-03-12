# 腾讯云托管部署清单（后端 + 小程序）

本文用于生产部署前逐项核对，避免因环境变量、数据库或域名配置遗漏导致启动失败。

## 1. 云托管服务配置

- 运行端口：容器内监听 `80`（镜像默认 `SERVER_PORT=80`）。
- 启动环境：镜像默认 `SPRING_PROFILES_ACTIVE=prod`。
- 实例规格：建议至少 `1C2G`，避免冷启动后频繁 OOM。

## 2. 必填环境变量

在腾讯云托管环境变量中配置以下键值：

- `DB_URL`：例如 `jdbc:mysql://<host>:3306/diet?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&useSSL=true&allowPublicKeyRetrieval=true`
- `DB_USERNAME`
- `DB_PASSWORD`
- `WECHAT_APP_ID`
- `WECHAT_APP_SECRET`
- `AUTH_TOKEN_SECRET`：生产环境必须使用高强度随机密钥（建议 32 位以上）
- `AUTH_TOKEN_EXPIRE_DAYS`：可选，默认 `30`

## 3. 数据库初始化（首次部署必做）

`prod` 环境关闭了 Spring 自动建表，因此首次部署前必须先建库建表。

1. 在腾讯云 MySQL 创建数据库：`diet`
2. 执行脚本：`src/main/resources/schema.sql`
3. 确认业务账号拥有目标库的 DDL/DML 权限

说明：应用启动后会自动补齐部分字段/索引并导入内置食物、运动数据，但前提是基础表已存在。

## 4. 健康检查建议

- 协议：`HTTP`
- 路径：`/api/ping`
- 期望状态码：`200`
- 超时与重试：按云托管默认值起步，再结合实际响应时间微调

## 5. 镜像与发布

1. 在项目根目录构建镜像：`docker build -t <registry>/xinqi-diet:<tag> .`
2. 推送到腾讯云容器镜像仓库
3. 云托管选择对应镜像版本发布
4. 发布后检查容器日志，确认无 `Datasource`、`wechat app id/secret`、`token-secret` 相关报错

## 6. 小程序云托管配置

当前小程序主链路已切换为 `wx.cloud.callContainer`，普通小程序运行时配置以 `miniprogram/utils/constants.js` 为准：

- `develop` 默认走本地 `http://127.0.0.1:8080`
- `trial/release` 默认走微信云托管
- 如后续接入第三方平台代开发，再考虑使用 `ext.json` / `wx.getExtConfigSync()`

补充说明（微信云托管特性）：

- 若小程序通过 `wx.cloud.callContainer` / `wx.cloud.connectContainer` 调用微信云托管，可不配置小程序通讯域名。
- 项目中仍保留 `wx.request + BASE_URL` 兜底分支（默认关闭）；只有启用该分支时才需要配置合法 request 域名。

## 7. 上线验收（最小回归）

- 微信登录：`/api/auth/wechat/login` 成功返回 token
- 启动日志：确认出现 `activeProfiles=prod` 且 `wechat.mock-enabled=false`
- 数据抽样：执行 `SELECT id, open_id FROM user_profile ORDER BY id DESC LIMIT 20;`，确认 `open_id` 不包含 `mock_openid_`
- 首页汇总：`/api/users/{id}/daily-summary` 返回成功
- 饮食记录新增/查询成功
- 运动记录新增/查询成功
- 健康日记：保存/查询/删除成功，首页可展示当日日记摘要
- 首登引导：新用户首次登录会进入分步资料引导页，可跳过单项或全部
