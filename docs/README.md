# 项目文档导航

## 1. 快速入口

- 页面与功能：`docs/page-entry-map.md`、`docs/feature-inventory.md`
- 接口与部署：`docs/miniprogram-api.md`、`docs/tencent-cloud-hosting-checklist.md`
- 协作与维护：`docs/dev-handoff.md`、`docs/change-log-next.md`、`docs/current-ux-issues.md`

## 2. 推荐阅读顺序

1. `docs/page-entry-map.md`（先看页面入口和主链路）
2. `docs/feature-inventory.md`（按功能编号定位需求）
3. `docs/miniprogram-api.md`（确认前后端字段与接口）
4. `docs/dev-handoff.md`（接手环境与流程）
5. `docs/change-log-next.md`（查看最近变更与回归信息）

## 3. 饮食记录链路（当前口径）

- 首页加号 -> `pages/food-search/index`（`source=home`）
- 首页饮食记录点击 -> `pages/food-search/index`（`mode=edit&recordId&source=home`）
- 食物选择后在同页底部弹窗编辑重量：
  - 新建：`添加`
  - 编辑：`完成编辑`
- 自定义食物入口：仅在“自定义”分类标题右侧显示 `添加` 按钮

## 4. 文档维护规则

- 页面入口变更：同步更新 `docs/page-entry-map.md`
- 功能状态变更：同步更新 `docs/feature-inventory.md`
- 交互问题和体验债务：更新 `docs/current-ux-issues.md`
- 每次功能迭代结束：在 `docs/change-log-next.md` 追加记录
