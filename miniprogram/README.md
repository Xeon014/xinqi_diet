# 小程序工程说明

## 目录

- `pages/home`：首页与今日汇总
- `pages/meal-editor`：饮食记录编辑
- `pages/exercise-editor`：运动记录编辑
- `pages/health-diary-editor`：健康日记编辑（图文）
- `pages/food-search`：食品搜索与选择
- `pages/progress`：热量趋势图
- `pages/profile`：用户资料编辑
- `components`：基础展示组件
- `services`：接口调用封装
- `utils`：请求、鉴权和常量工具

## 联调方式

1. 启动后端服务：`mvn spring-boot:run`
2. 用微信开发者工具打开 `miniprogram` 目录
3. 在项目配置中确认 `miniprogramRoot` 指向当前目录 `./`
4. 默认通过 `wx.cloud.callContainer` 调微信云托管，不走 `wx.request` 直连

## 关键约定

- 小程序启动时会自动执行 `wx.login`，并调用 `/api/auth/wechat/login`。
- 登录成功后会本地缓存 `accessToken` 与 `userId`，请求层自动附带 `Authorization`。
- 云托管服务配置优先从 `ext.json` 的 `ext.cloudEnvId` 与 `ext.cloudService` 读取。
- `utils/constants.js` 中的 `BASE_URL` 仅用于关闭云托管模式后的兜底方案。
