# 小程序工程说明

## 目录（核心页面）

- `pages/home`：首页（日期切换、净热量总览、分组记录、健康日记入口）
- `pages/food-search`：食物选择页（搜索、分类、最近搜索、食物编辑底部弹窗）
- `pages/exercise-editor`：运动记录编辑
- `pages/exercise-search`：运动搜索与选择
- `pages/health-diary-editor`：健康日记编辑（图文）
- `pages/profile`：我的页
- `pages/personal-info`：个人基础资料维护
- `pages/health-profile`：健康档案维护（体重、BMR、TDEE）
- `pages/meal-combo-manage`：自定义套餐管理
- `pages/progress`：趋势页
- `pages/onboarding-profile`：首次登录资料引导
- `pages/custom-food`：自定义食物创建
- `pages/custom-exercise`：自定义运动创建

## 饮食记录链路（当前实现）

- 首页右下角加号：进入 `food-search`（携带推荐餐次与日期）。
- 首页已有饮食记录：进入 `food-search` 的编辑模式（携带 `mode=edit&recordId`）。
- 在 `food-search` 选中食物后，不再跳转独立页面，而是从底部弹出食物编辑弹窗：
  - 新建场景按钮：`添加`
  - 编辑场景按钮：`完成编辑`
- 自定义食物入口位于“自定义”列表标题右侧的 `添加` 按钮。
- 食物列表仅展示名称与热量（`kcal`），不展示蛋白/碳水/脂肪明细。

## 当前无可见业务入口的页面（待后续清理）

- `pages/meal-editor`
- `pages/food-item-editor`

## 联调方式

1. 启动后端服务：`mvn spring-boot:run`
2. 用微信开发者工具打开 `miniprogram` 目录
3. 在项目配置中确认 `miniprogramRoot` 指向当前目录 `./`
4. 用微信开发者工具以 `develop` 环境联调时，默认直连本地 `127.0.0.1:8080`
5. `trial/release` 默认走微信云托管，切换逻辑定义在 `utils/constants.js`
6. 如修改了运行时配置映射，在微信开发者工具里“清缓存并编译”后生效

## 关键约定

- 小程序启动时会自动执行 `wx.login`，并调用 `/api/auth/wechat/login`。
- 登录成功后会本地缓存 `accessToken` 与 `userId`，请求层自动附带 `Authorization`。
- 新用户首次登录会进入资料引导页，可逐项跳过或全部跳过。
- `app.json` 已启用组件按需注入：`"lazyCodeLoading": "requiredComponents"`。
- 普通小程序运行时配置以 `utils/constants.js` 为准：`develop` 默认本地直连，`trial/release` 默认走云托管。
- `ext.json` 仅适用于第三方平台代开发场景，本项目当前 `appid` 不使用该方案。

## 必跑校验

- 每次修改小程序后执行：`node scripts/verify-miniprogram-files.js`
