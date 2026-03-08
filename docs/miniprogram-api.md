# 小程序接口对接说明

## 基础约定

- 所有接口统一使用 `/api` 作为前缀。
- 所有响应统一使用 `ApiResponse<T>`。
- 小程序侧优先判断 HTTP 状态码，其次判断 `code` 是否为 `SUCCESS`。
- 除登录接口外，业务接口统一携带 `Authorization: Bearer {accessToken}`。

统一响应结构：

```json
{
  "code": "SUCCESS",
  "message": "ok",
  "data": {},
  "timestamp": "2026-03-07T23:40:00"
}
```

## 认证接口

### 微信登录并自动建档

`POST /api/auth/wechat/login`

请求：

```json
{
  "code": "wx.login返回的code",
  "clientUserKey": "客户端本地用户键(开发 mock 可选)"
}
```

响应：

```json
{
  "code": "SUCCESS",
  "message": "ok",
  "data": {
    "accessToken": "xxx.yyy",
    "userId": 1,
    "isNewUser": true
  },
  "timestamp": "2026-03-07T23:40:00"
}
```

## 各接口 data 结构

### 1. 查询用户列表

`GET /api/users`

### 2. 查询食品列表

`GET /api/foods?keyword=米饭`

### 3. 查询某日饮食记录

`GET /api/records?date=2026-03-07`

- `userId` 参数可选；有 token 时由后端自动识别。

### 4. 查询某日汇总

`GET /api/users/1/daily-summary?date=2026-03-07`

`data` 直接为 `DailySummaryResponse`。

### 5. 查询进度趋势

`GET /api/users/1/progress?startDate=2026-03-01&endDate=2026-03-07`

`data` 直接为 `ProgressSummaryResponse`。

### 6. 更新用户资料

`PUT /api/users/1`

### 7. 创建饮食记录

`POST /api/records`

```json
{
  "foodId": 1,
  "mealType": "LUNCH",
  "quantityInGram": 180,
  "recordDate": "2026-03-07"
}
```

## 小程序接入建议

- `app.onLaunch` 先执行 `wx.login -> /api/auth/wechat/login`，保存 `accessToken + userId`。
- 请求层统一自动附带 `Authorization`，401 时自动重登一次。
- 首页：调用 `/api/users/{id}/daily-summary` 展示当天摄入概览。
- 资料页：调用 `/api/users/{id}` 展示并编辑用户资料，同时展示 `bmr` 与 `tdee`。
- 食品搜索页：调用 `/api/foods?keyword=` 做输入联想。
- 记录页：先拉食品列表，再调用 `/api/records` 提交饮食记录。
- 趋势页：调用 `/api/users/{id}/progress` 直接绘制折线图。
