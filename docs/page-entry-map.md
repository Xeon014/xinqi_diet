# 页面入口与跳转地图（初稿）

> 目标：快速看清“用户从哪里进、跳到哪里去、在哪一步完成任务”。

## 1. 顶层导航（Tab）

- 首页：`pages/home/index`
- 趋势：`pages/progress/index`
- 我的：`pages/profile/index`

## 2. 首页链路

- 首页主按钮 `记录推荐餐次` -> `pages/meal-editor/index`
- 首页记录流（饮食项） -> `pages/meal-editor/index?mode=edit`
- 首页记录流（运动项） -> `pages/exercise-editor/index?mode=edit`

## 3. 饮食链路

- `meal-editor` -> `food-search`（添加食物）
- `food-search` -> `custom-food`（新建自定义食物）
- `meal-editor` -> 套餐选择（弹窗）
- `meal-editor` -> 保存为套餐（创建）
- `meal-editor` 顶部切换 -> `exercise-editor`（保留日期）

## 4. 运动链路

- `exercise-editor` -> `exercise-search`（添加运动）
- `exercise-search` -> `custom-exercise`（新建自定义运动）
- `exercise-editor` 顶部切换 -> `meal-editor`（保留日期与餐次）

## 5. 我的页链路

- `profile` -> `personal-info`
- `profile` -> `health-profile`
- `profile` -> `food-search`
- `profile` -> `meal-combo-manage`
- `profile` -> `exercise-search`

## 6. 套餐管理链路

- `meal-combo-manage` 列表 -> 编辑态（同页）
- 编辑态 -> `food-search`（添加食物）
- 编辑态 -> 保存套餐更新
- 列表态 -> 删除套餐

## 7. 当前“有页面但无可见入口”

- 暂无

## 8. 建议维护方式

- 每新增页面或入口，先更新本文件。
- 入口变更时同步更新 `docs/feature-inventory.md` 中对应功能编号。
