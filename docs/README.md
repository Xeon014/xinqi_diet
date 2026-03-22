# 仓库文档导航

> 根 `docs/` 只放仓库级和跨应用文档；应用专属文档分别下沉到 `backend/docs/` 与 `miniprogram/docs/`。

## 1. 快速入口

- 仓库总览：`README.md`
- 后端说明：`backend/README.md`、`backend/docs/腾讯云托管部署清单.md`
- 小程序说明：`miniprogram/README.md`、`miniprogram/docs/页面入口与跳转地图.md`
- 协作与维护：`docs/开发接手指南.md`、`docs/变更日志.md`、`docs/小程序接口对接说明.md`

## 2. 推荐阅读顺序

1. `README.md`（先看仓库结构和进入方式）
2. `backend/README.md`（后端启动、数据库和部署入口）
3. `miniprogram/README.md`（小程序工程与调试说明）
4. `docs/小程序接口对接说明.md`（确认前后端字段与接口）
5. `docs/开发接手指南.md`（接手环境与常用命令）

## 3. 文档归属

- 根 `docs/`：仓库级说明、接手指南、变更日志、跨应用接口文档
- `backend/docs/`：数据库、部署、数据维护等后端专属文档
- `miniprogram/docs/`：页面入口、功能清单、体验问题等小程序专属文档

## 4. 常用定位

- 后端功能与数据库：`backend/docs/数据库删库重建与 Flyway 基线.md`
- 小程序页面与功能：`miniprogram/docs/功能总览清单.md`
- 小程序页面跳转：`miniprogram/docs/页面入口与跳转地图.md`
- 小程序体验债务：`miniprogram/docs/当前体验问题清单.md`

## 5. 文档维护规则

- 页面入口变更：同步更新 `miniprogram/docs/页面入口与跳转地图.md`
- 功能状态变更：同步更新 `miniprogram/docs/功能总览清单.md`
- 交互问题和体验债务：更新 `miniprogram/docs/当前体验问题清单.md`
- 后端部署、数据库、数据维护规则：同步更新 `backend/docs/`
- 每次功能迭代结束：在 `docs/变更日志.md` 追加记录
