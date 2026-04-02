# 面向AI Agent的项目总览

> 目标：让 agent 在首次进入仓库时，快速建立产品模型、代码地图、事实来源优先级和常见任务入口。

## 1. 产品与顶层导航

- 首页：查看某一天的净热量、饮食记录、运动记录、健康日记，并从这里继续记录饮食或运动
- 趋势：查看体重、BMI、围度趋势；支持快捷记录和查看单项历史
- 我的：进入个人信息、健康档案、自定义食物、自定义运动、自定义套餐、体重导入等管理页

面向用户的核心目标是：

- 低成本记录每日饮食和运动
- 查看体重与围度变化趋势
- 维护健康档案并根据当前体征调整目标
- 支持从其他应用导入历史体重数据

如果 agent 扮演客服或助理，应优先按“当前已实现”回答，不要把设计草案、历史页面或未落地能力说成现有功能。

## 2. 仓库结构与代码入口

- `backend/`
  - `src/main/java/com/diet/trigger/controller`：HTTP Controller 入口
  - `src/main/java/com/diet/app`：应用服务与用例编排
  - `src/main/java/com/diet/domain`：领域模型与仓储接口
  - `src/main/java/com/diet/infra`：MyBatis Mapper、Repository 实现、外部依赖
  - `src/main/java/com/diet/api`：请求/响应 DTO 与接口契约
  - `src/main/resources/db/migration`：Flyway 增量迁移
  - `src/main/resources/schema.sql`：当前结构快照
- `miniprogram/`
  - `app.js` / `app.json`：小程序启动、登录、全局页面注册
  - `pages/`：页面实现，按业务页面拆分
  - `services/`：请求封装，供页面直接调用
  - `utils/constants.js`：环境与运行时配置入口
  - `components/`：可复用组件
- `docs/`
  - 仓库级说明、跨应用接口文档、接手指南、变更日志

## 3. 当前关键业务链路

- 登录与首次引导
  - 小程序启动时自动执行 `wx.login`
  - 调用 `/api/auth/wechat/login`
  - 新用户进入 `pages/onboarding-profile`
- 首页记录链路
  - `pages/home` 是高频入口
  - 饮食记录：`home -> food-search -> 底部弹窗编辑 -> 返回首页`
  - 运动记录：`home -> exercise-search -> 底部弹窗编辑 -> 返回首页`
- 趋势与体征链路
  - `pages/health-profile` 可跳转 `pages/progress`
  - `pages/progress` 内完成趋势浏览、快捷记录、查看单项历史
  - `pages/metric-history` 查看某个指标的历史明细
- 体重导入链路
  - `pages/profile` -> `pages/weight-import`
  - `/api/body-metrics/import/preview` 预览
  - `/api/body-metrics/import/confirm` 确认导入

## 4. 趋势页当前实现事实

- 页面路径：`miniprogram/pages/progress`
- 趋势图固定在单屏内展示，不允许左右滑动
- 顶部主数值与日期跟随当前选中点变化，不固定显示最新记录
- 趋势点只保留很小的弱化锚点，不再显示点上方数值
- `MONTH / YEAR / ALL` 当前都展示原始日级点，不做图表聚合
- `ALL` 会在前端自动拉取所有分页数据后再一次性渲染，不再展示“加载更早数据”按钮
- `YEAR / ALL` 横轴只显示首尾两个标签，格式为 `YYYY-MM`
- 纵轴保留三条水平线，对应顶部 / 中间 / 底部三个整数刻度
- 指标卡仍展示各指标最近一次记录值与日期，不跟随图表选点变化
- 体重和围度支持同页快捷记录，BMI 只支持查看

## 5. 文档与事实来源优先级

- 第一优先：当前代码与运行行为
- 第二优先：`AGENTS.md` 中的仓库规则、编码约束、数据库与文档要求
- 第三优先：本文件，用于快速建立产品与代码全貌
- 第四优先：细分文档
  - 客服/助理标准答法：`docs/客服与助理问答基线.md`
  - 页面入口与跳转：`miniprogram/docs/页面入口与跳转地图.md`
  - 功能状态：`miniprogram/docs/功能总览清单.md`
  - 接口字段与调用方：`docs/小程序接口对接说明.md`
  - 启动、数据库、部署：`backend/README.md` 与 `backend/docs/`
  - 历史改动：`docs/变更日志.md`

如果文档与代码冲突，agent 应优先相信代码，并把冲突点回写到文档。

## 6. 常见任务如何定位

- 修改趋势图、趋势页交互、体征记录弹窗
  - 先看 `miniprogram/pages/progress/*`
  - 再看 `miniprogram/services/body-metric.js`
  - 同步更新 `miniprogram/README.md`、`miniprogram/docs/页面入口与跳转地图.md`、`miniprogram/docs/功能总览清单.md`
- 修改体征相关后端接口或查询逻辑
  - 先看 `backend/src/main/java/com/diet/trigger/controller/BodyMetricRecordController.java`
  - 再看 `backend/src/main/java/com/diet/app/metric/*`
  - SQL 在 `backend/src/main/resources/mapper/BodyMetricRecordRepository.xml`
  - DTO 在 `backend/src/main/java/com/diet/api/metric/*`
- 修改首页记录链路
  - 看 `miniprogram/pages/home/*`
  - 饮食链路看 `miniprogram/pages/food-search/*` 与 `miniprogram/services/record.js`
  - 运动链路看 `miniprogram/pages/exercise-search/*` 与 `miniprogram/services/exercise-record.js`
- 修改运行环境或请求地址
  - 小程序看 `miniprogram/utils/constants.js`
  - 后端看 `backend/src/main/resources/application*.yml`
- 修改数据库结构
  - 先改 `backend/src/main/resources/db/migration/`
  - 再同步 `backend/src/main/resources/schema.sql`
  - 如涉及空库重建，再同步 `backend/scripts/sql/schema-full-latest.sql`

## 7. 最低验证动作

- 仅改小程序：`cd miniprogram && node scripts/verify-miniprogram-files.js`
- 改后端 Java：`cd backend && mvn -q -DskipTests compile`
- 改接口或高风险后端逻辑：`cd backend && mvn -q test`
- 改文档但涉及实现口径修正：至少手动核对对应源码入口

## 8. 文档同步清单

- 客服/助理可回答的产品事实变化：同步更新 `docs/客服与助理问答基线.md`
- 页面入口或页面内主链路变更：同步更新 `miniprogram/docs/页面入口与跳转地图.md`
- 功能状态或交互口径变更：同步更新 `miniprogram/docs/功能总览清单.md`
- 接口路径、字段、参数名、调用方变更：同步更新 `docs/小程序接口对接说明.md`
- 跨应用认知、阅读顺序、任务入口变化：同步更新 `README.md`、`docs/README.md`、本文件
- 每轮迭代结束：追加 `docs/变更日志.md`
