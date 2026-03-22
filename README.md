# 心栖轻食仓库说明

本仓库采用前后端同仓的多应用布局：

- `backend/`：Spring Boot 后端服务
- `miniprogram/`：微信小程序工程
- `docs/`：仓库级文档、协作说明与跨应用资料

## 快速入口

- 后端说明：`backend/README.md`
- 小程序说明：`miniprogram/README.md`
- 仓库文档导航：`docs/README.md`

## 常用命令

后端：

1. 进入目录：`cd backend`
2. 启动开发环境：`mvn spring-boot:run`
3. 编译检查：`mvn -q -DskipTests compile`
4. 构建镜像：`docker build -f Dockerfile .`

小程序：

1. 用微信开发者工具打开 `miniprogram/`
2. 修改小程序后执行：`cd miniprogram && node scripts/verify-miniprogram-files.js`

## 目录约定

- 后端专属脚本、SQL 与部署说明放在 `backend/`
- 小程序专属校验脚本与页面文档放在 `miniprogram/`
- 跨应用接口说明、接手指南、变更日志放在根 `docs/`
