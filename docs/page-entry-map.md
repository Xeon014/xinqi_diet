# 页面入口与跳转地图

> 目标：快速看清“用户从哪里进入、在何处完成任务、最终回到哪里”。

## 1. 顶层导航（Tab）

- 首页：`pages/home/index`
- 趋势：`pages/progress/index`
- 我的：`pages/profile/index`

## 2. 首页主链路

- 新用户首登首页 -> `pages/onboarding-profile/index`
- 首页右下角加号（饮食记录） -> `pages/food-search/index?recordDate=...&mealType=...&source=home`
- 首页记录流（饮食项） -> `pages/food-search/index?mode=edit&recordId=...&recordDate=...&mealType=...&source=home`
- 首页记录流（运动项） -> `pages/exercise-editor/index?mode=edit&recordDate=...`
- 首页健康日记区 -> `pages/health-diary-editor/index?recordDate=...`

## 3. 饮食链路（当前实现）

- `food-search` 页面内完成“选择 + 编辑”：
  - 搜索关键字时，隐藏左侧分类并在全量食物中检索
  - 支持“最近记录 / 最近搜索 / 自定义 / 分类”筛选
  - 食物列表展示：食物名 + 热量（kcal）
- 选择食物后，打开同页底部弹窗编辑（不再跳独立编辑页）：
  - 新建按钮：`添加`
  - 编辑按钮：`完成编辑`
  - 头部操作：删除图标（编辑态） + 关闭图标
- 自定义食物入口：仅在“自定义”筛选标题右侧显示 `添加` 按钮
- 自定义食物创建页：`food-search -> custom-food`，创建后回流到 `food-search`

## 4. 运动链路

- `exercise-editor` -> `exercise-search`（添加运动）
- `exercise-search` -> `custom-exercise`（新建自定义运动）
- `exercise-editor` 顶部切换到饮食 -> `food-search`（保留日期/餐次）

## 5. 我的页链路

- `profile` -> `personal-info`
- `profile` -> `health-profile`
- `profile` -> `food-search`（自定义食物工具入口）
- `profile` -> `meal-combo-manage`
- `profile` -> `exercise-search`

## 6. 套餐管理链路

- `meal-combo-manage` 列表 -> 编辑态（同页）
- 编辑态 -> `food-search`（添加食物）
- 编辑态 -> 保存套餐更新
- 列表态 -> 删除套餐

## 7. 当前无可见业务入口页面

- `pages/meal-editor/index`（历史页面，代码仍在）
- `pages/food-item-editor/index`（历史页面，代码仍在）

## 8. 维护建议

- 页面入口或跳转参数变化时，优先更新本文件。
- 同步检查 `docs/feature-inventory.md` 对应功能编号与状态描述。
