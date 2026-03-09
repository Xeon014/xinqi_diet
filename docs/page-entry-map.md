# 页面入口与跳转地图（初稿）

> 目标：快速看清“用户从哪里进、跳到哪里去、在哪一步完成任务”。

## 1. 顶层导航（Tab）

- 首页：`pages/home/index`
- 记录：`pages/record-create/index`
- 我的：`pages/profile/index`

## 2. 首页链路

- 首页主按钮 `记录推荐餐次` -> `pages/meal-editor/index`
- 首页记录流（饮食项） -> `pages/meal-editor/index?mode=edit`
- 首页记录流（运动项） -> `pages/exercise-editor/index?mode=edit`

## 3. 记录页链路

- 记录页顶部：日期切换（前一天/后一天/选择器）
- `记录XX餐` -> `pages/meal-editor/index`
- `记录运动` -> `pages/exercise-editor/index`

## 4. 饮食链路

- `meal-editor` -> `food-search`（添加食物）
- `food-search` -> `custom-food`（新建自定义食物）
- `meal-editor` -> 套餐选择（弹窗）
- `meal-editor` -> 保存为套餐（创建）

## 5. 运动链路

- `exercise-editor` -> `exercise-search`（添加运动）
- `exercise-search` -> `custom-exercise`（新建自定义运动）

## 6. 我的页链路

- `profile` -> `personal-info`
- `profile` -> `health-profile`
- `profile` -> `food-search`
- `profile` -> `meal-combo-manage`
- `profile` -> `exercise-search`

## 7. 套餐管理链路

- `meal-combo-manage` 列表 -> 编辑态（同页）
- 编辑态 -> `food-search`（添加食物）
- 编辑态 -> 保存套餐更新
- 列表态 -> 删除套餐

## 8. 当前“有页面但无可见入口”

- `pages/progress/index`（趋势页）

## 9. 建议维护方式

- 每新增页面或入口，先更新本文件。
- 入口变更时同步更新 `docs/feature-inventory.md` 中对应功能编号。
