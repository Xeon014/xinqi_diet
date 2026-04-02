# 心栖轻食仓库说明

本仓库是 `心栖轻食` 的双应用单仓：

- `backend/`：Spring Boot 3 后端，负责登录、记录、体征、导入、套餐等接口与数据持久化
- `miniprogram/`：微信小程序，承载首页记录、趋势、我的页、健康档案等用户交互
- `docs/`：仓库级与跨应用文档，包含 agent 总览、接口说明、接手指南和变更日志

## 如果你是 AI agent

建议按下面顺序建立项目认知：

1. `docs/面向AI Agent的项目总览.md`
2. `backend/README.md`
3. `miniprogram/README.md`
4. `docs/小程序接口对接说明.md`
5. `docs/开发接手指南.md`
6. `AGENTS.md`

## 快速入口

- 面向 agent 的仓库总览：`docs/面向AI Agent的项目总览.md`
- 面向客服/助理的问答基线：`docs/客服与助理问答基线.md`
- 后端说明：`backend/README.md`
- 小程序说明：`miniprogram/README.md`
- 仓库文档导航：`docs/README.md`

## 常用命令

后端：

1. 进入目录：`cd backend`
2. 启动开发环境：`mvn spring-boot:run`
3. 编译检查：`mvn -q -DskipTests compile`
4. 回归测试：`mvn -q test`

小程序：

1. 用微信开发者工具打开 `miniprogram/`
2. 修改小程序后执行：`cd miniprogram && node scripts/verify-miniprogram-files.js`

仓库级串行校验：

1. 在仓库根目录执行：`bash scripts/verify-project.sh`

## 项目事实源

- 仓库约束与协作规则：`AGENTS.md`
- 页面入口与跳转：`miniprogram/docs/页面入口与跳转地图.md`
- 功能状态与当前实现：`miniprogram/docs/功能总览清单.md`
- 前后端接口契约：`docs/小程序接口对接说明.md`
- 运行、部署、数据库与维护：`backend/README.md` 与 `backend/docs/`
- 迭代历史与回滚线索：`docs/变更日志.md`

当文档与代码冲突时，以当前代码与运行行为为准，并回写文档。

## 目录约定

- 后端专属脚本、SQL 与部署说明放在 `backend/`
- 小程序专属校验脚本、页面文档与开发说明放在 `miniprogram/`
- 跨应用接口说明、agent 总览、接手指南、变更日志放在根 `docs/`
