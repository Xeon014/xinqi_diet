# 小程序工程说明

## 目录

- `pages/home`：首页与今日汇总
- `pages/onboarding-profile`：首次登录资料引导
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
4. 通过脚本写入 `ext.json` 切换请求通道：
   - 推荐（一次配置）：`node scripts/switch-ext-config.js local`
     - `develop` 走本地 `127.0.0.1:8080`
     - `trial/release` 仍走云托管（发布无需再切）
   - 如需在开发工具直接联调云托管：`node scripts/switch-ext-config.js trial`
5. 在微信开发者工具里“清缓存并编译”后生效

## 关键约定

- 小程序启动时会自动执行 `wx.login`，并调用 `/api/auth/wechat/login`。
- 登录成功后会本地缓存 `accessToken` 与 `userId`，请求层自动附带 `Authorization`。
- 新用户首次登录会进入资料引导页，可逐项跳过或全部跳过。
- 云托管与本地直连开关、环境参数都从 `ext.json` 读取（支持 `ext.runtime.develop/trial/release`）。
- `utils/constants.js` 中的映射为兜底值，优先级低于 `ext.json`。
