# 小程序工程说明

## 目录（核心页面）

- `pages/home`：首页（日期切换、净热量总览、分组记录、健康日记入口）
- `pages/food-search`：食物选择页（搜索、分类、最近搜索、套餐、食物编辑底部弹窗）
- `pages/exercise-search`：运动选择页（搜索、分类、最近搜索、运动编辑底部弹窗）
- `pages/health-diary-editor`：健康日记编辑（图文）
- `pages/profile`：我的页
- `pages/personal-info`：个人基础资料维护
- `pages/health-profile`：健康档案维护（体重、BMR、TDEE）
- `pages/meal-combo-manage`：自定义套餐管理
- `pages/progress`：趋势页
- `pages/metric-history`：单项体征历史记录页
- `pages/onboarding-profile`：首次登录资料引导
- `pages/custom-food`：自定义食物管理
- `pages/custom-exercise`：自定义运动管理

## 对 AI agent 有帮助的源码入口

- 全局启动与登录：`app.js`
- 页面注册与顶层导航：`app.json`
- 运行时环境切换：`utils/constants.js`
- 请求封装与接口入口：`services/`
- 首页记录链路：`pages/home`、`pages/food-search`、`pages/exercise-search`
- 趋势与体征链路：`pages/progress`、`pages/metric-history`、`services/body-metric.js`
- 我的页与健康档案：`pages/profile`、`pages/health-profile`

## 饮食记录链路（当前实现）

- 首页右下角加号：进入 `food-search`（携带推荐餐次与日期）。
- 首页已有饮食记录：进入 `food-search` 的编辑模式（携带 `mode=edit&recordId`）。
- 在 `food-search` 选中食物后，不再跳转独立页面，而是从底部弹出食物编辑弹窗：
  - 新建场景按钮：`添加`
  - 编辑场景按钮：`完成编辑`
- 食物选择页左侧筛选：`最近记录 / 最近搜索 / 自定义 / 套餐 / 内置分类`
- 自定义套餐页不再设置默认餐次，列表显示整套热量，编辑页显示整套热量和三大营养素汇总。
- 自定义食物入口位于“自定义”列表标题右侧的 `添加` 按钮。
- “我的 -> 自定义食物”进入独立管理页，支持新建、编辑、删除。
- 食物列表仅展示名称与热量（`kcal`），不展示蛋白/碳水/脂肪明细。

## 运动记录链路（当前实现）

- 首页右下角加号：进入 `exercise-search`（携带日期）。
- 首页已有运动记录：进入 `exercise-search` 的编辑模式（携带 `mode=edit&recordId`）。
- 在 `exercise-search` 选中运动后，从同页底部弹出运动编辑弹窗：
  - 新建场景按钮：`添加`
  - 编辑场景按钮：`保存`
- 运动选择页左侧筛选：`最近运动 / 最近搜索 / 自定义 / 内置分类`
- 自定义运动入口位于“自定义”筛选标题右侧的 `添加` 按钮。
- “我的 -> 自定义运动”进入独立管理页，支持新建、编辑、删除。

## 当前无可见业务入口的页面

- `pages/food-item-editor`（历史代码保留，已不再注册到 `app.json`）

## 趋势与体征链路（当前实现）

- Tab“趋势”：进入 `pages/progress`，展示体重、BMI 和围度趋势。
- 趋势图固定在单屏宽度内展示，不允许左右滑动。
- 趋势图顶部主数值与日期跟随当前选中点变化，不固定显示最新体重。
- 趋势点仅保留很小的弱化锚点，不再显示点上方数值。
- `MONTH / YEAR / ALL` 当前都直接展示日级点，不做图表聚合。
- `ALL` 进入后会自动拉取全量分页结果，不再展示“加载更早数据”按钮。
- `YEAR / ALL` 横轴只显示首尾两个 `YYYY-MM` 标签。
- 纵轴保留三条水平线，并显示整数刻度。
- 趋势页卡片右上角 `+`：直接记录当前指标（BMI 仅支持查看，不支持手工新增）。
- 趋势页卡片右上角 `···`：进入 `pages/metric-history` 查看单项指标历史明细。
- 健康档案页底部入口：可直接跳转趋势页查看近期变化。

## 联调方式

1. 启动后端服务：`cd ../backend && mvn spring-boot:run`
2. 用微信开发者工具打开 `miniprogram` 目录
3. 在项目配置中确认 `miniprogramRoot` 指向当前目录 `./`
4. 用微信开发者工具以 `develop` 环境联调时，默认直连本地 `127.0.0.1:8080`
5. `trial/release` 默认走微信云托管，切换逻辑定义在 `utils/constants.js`
6. 如修改了运行时配置映射，在微信开发者工具里“清缓存并编译”后生效

## 本地缓存版本

- 小程序启动时会检查 `xinqi_storage_schema_version`
- 当前缓存结构版本是 `2`
- 若本地版本不是 `2`，启动时会执行一次 `wx.clearStorageSync()`，然后写回新版本
- 这次发布会因此清空登录态、最近记录、最近搜索和引导状态，随后自动重新登录

## 微信开发者工具控制台调试命令

以下命令可直接在微信开发者工具的 Console 中执行。

### 查看当前登录态

```js
wx.getStorageSync("xinqi_access_token")
wx.getStorageSync("xinqi_user_id")
wx.getStorageSync("xinqi_client_user_key")
getApp().globalData.onboardingPendingUserId
```

### 让当前账号重新进入首次登录引导

适合调试引导页样式、步骤切换、保存逻辑，不会新建用户。

```js
const userId = wx.getStorageSync("xinqi_user_id");
wx.setStorageSync(`onboarding_pending_${userId}`, true);
getApp().globalData.onboardingPendingUserId = Number(userId);
wx.reLaunch({ url: "/pages/home/index" });
```

### 完全模拟“首次登录的新用户”

当前后端 `dev` 环境开启了微信登录 mock，mock 用户身份由 `xinqi_client_user_key` 决定。  
因此要模拟一个全新的首次登录用户，需要同时清掉登录态和 `clientUserKey`。

```js
wx.removeStorageSync("xinqi_access_token");
wx.removeStorageSync("xinqi_user_id");
wx.removeStorageSync("xinqi_client_user_key");
getApp().globalData.onboardingPendingUserId = null;
getApp().ensureLogin(true).then((res) => {
  console.log("新的登录结果", res);
  wx.reLaunch({ url: "/pages/home/index" });
});
```

### 强制当前账号重新登录

适合排查 token、登录接口、自动鉴权问题，不会清掉 `clientUserKey`。

```js
wx.removeStorageSync("xinqi_access_token");
wx.removeStorageSync("xinqi_user_id");
getApp().ensureLogin(true).then(console.log);
```

### 标记当前引导已完成

适合测试“非新用户进入首页”的路径。

```js
const userId = wx.getStorageSync("xinqi_user_id");
wx.removeStorageSync(`onboarding_pending_${userId}`);
getApp().globalData.onboardingPendingUserId = null;
wx.reLaunch({ url: "/pages/home/index" });
```

### 清空全部本地缓存

```js
wx.clearStorageSync();
getApp().globalData.onboardingPendingUserId = null;
```

## 关键约定

- 小程序启动时会自动执行 `wx.login`，并调用 `/api/auth/wechat/login`。
- 登录成功后会本地缓存 `accessToken` 与 `userId`，请求层自动附带 `Authorization`。
- 新用户首次登录会进入资料引导页，可逐项跳过或全部跳过。
- `app.json` 已启用组件按需注入：`"lazyCodeLoading": "requiredComponents"`。
- 普通小程序运行时配置以 `utils/constants.js` 为准：`develop` 默认本地直连，`trial/release` 默认走云托管。
- `ext.json` 仅适用于第三方平台代开发场景，本项目当前 `appid` 不使用该方案。

## 必跑校验

- 每次修改小程序后执行：`node scripts/verify-miniprogram-files.js`
