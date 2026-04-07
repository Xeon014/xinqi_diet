# 仓库文档导航

> 根 `docs/` 只放仓库级和跨应用文档；应用专属文档分别下沉到 `backend/docs/` 与 `miniprogram/docs/`。

## 1. 快速入口

- 面向 AI agent 的总览：`docs/面向AI Agent的项目总览.md`
- 面向客服/助理的问答基线：`docs/客服与助理问答基线.md`
- 仓库总览：`README.md`
- 后端说明：`backend/README.md`、`backend/docs/腾讯云托管部署清单.md`
- 小程序说明：`miniprogram/README.md`、`miniprogram/docs/页面入口与跳转地图.md`
- 协作与维护：`docs/开发接手指南.md`、`docs/变更日志.md`、`docs/小程序接口对接说明.md`
- 功能设计：`docs/体重数据导入功能设计.md`
- 功能设计：`docs/营养成分表拍照识别设计与实现说明.md`

## 2. 推荐阅读顺序

如果你是 AI agent，建议顺序：

1. `docs/面向AI Agent的项目总览.md`
2. `README.md`
3. `backend/README.md`
4. `miniprogram/README.md`
5. `docs/小程序接口对接说明.md`
6. `docs/开发接手指南.md`

如果你是人类开发者，建议顺序：

1. `README.md`
2. `backend/README.md`
3. `miniprogram/README.md`
4. `docs/小程序接口对接说明.md`
5. `docs/开发接手指南.md`

## 3. 文档归属

- 根 `docs/`：仓库级说明、agent 总览、接手指南、变更日志、跨应用接口文档
- `backend/docs/`：数据库、部署、数据维护等后端专属文档
- `miniprogram/docs/`：页面入口、功能清单、体验问题等小程序专属文档

## 4. 常用定位

- 仓库结构与任务入口：`docs/面向AI Agent的项目总览.md`
- 客服/助理标准答法：`docs/客服与助理问答基线.md`
- 后端功能与数据库：`backend/docs/数据库删库重建与 Flyway 基线.md`
- 小程序页面与功能：`miniprogram/docs/功能总览清单.md`
- 小程序页面跳转：`miniprogram/docs/页面入口与跳转地图.md`
- 前后端接口契约：`docs/小程序接口对接说明.md`
- 小程序体验债务：`miniprogram/docs/当前体验问题清单.md`

## 5. 文档维护规则

- 页面入口或页面内主链路变更：同步更新 `miniprogram/docs/页面入口与跳转地图.md`
- 功能状态或当前交互口径变更：同步更新 `miniprogram/docs/功能总览清单.md`
- 接口路径、字段或参数名变更：同步更新 `docs/小程序接口对接说明.md`
- 跨应用认知、阅读顺序、任务入口变化：同步更新 `README.md`、本文件与 `docs/面向AI Agent的项目总览.md`
- 客服/助理可回答的产品事实变化：同步更新 `docs/客服与助理问答基线.md`
- 交互问题和体验债务：更新 `miniprogram/docs/当前体验问题清单.md`
- 每次功能迭代结束：在 `docs/变更日志.md` 追加记录
