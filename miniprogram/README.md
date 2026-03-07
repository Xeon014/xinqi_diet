# 小程序工程说明

## 目录

- `pages/home`：首页与今日汇总
- `pages/record-create`：新增饮食记录
- `pages/food-search`：食品搜索与选择
- `pages/progress`：热量趋势图
- `pages/profile`：用户资料编辑
- `components`：基础展示组件
- `services`：接口调用封装
- `utils`：请求、日期和常量工具

## 联调方式

1. 启动后端服务：`mvn spring-boot:run`
2. 用微信开发者工具打开仓库根目录
3. 在项目配置中确认 `miniprogramRoot` 指向 `miniprogram/`
4. 开发环境可关闭域名校验，直接请求 `http://127.0.0.1:8080`

## 关键约定

- 默认用户固定为 `userId = 1`
- 小程序统一消费后端 `ApiResponse<T>` 的 `data`
- 接口基地址定义在 `utils/constants.js`
