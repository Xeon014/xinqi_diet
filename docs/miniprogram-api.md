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

## 记录与查询接口

### 1. 查询食品列表

`GET /api/foods?keyword=米饭`

### 2. 查询运动列表

`GET /api/exercises?keyword=run&category=CARDIO`

### 3. 创建饮食记录

`POST /api/records`

```json
{
  "foodId": 1,
  "mealType": "LUNCH",
  "quantityInGram": 180,
  "recordDate": "2026-03-07"
}
```

### 4. 查询某日饮食记录

`GET /api/records?date=2026-03-07&mealType=LUNCH`

- `userId` 参数可选；有 token 时由后端自动识别。

### 5. 创建运动记录

`POST /api/exercise-records`

```json
{
  "exerciseId": 12,
  "durationMinutes": 30,
  "intensityLevel": "MEDIUM",
  "recordDate": "2026-03-07"
}
```

### 6. 查询某日运动记录

`GET /api/exercise-records?date=2026-03-07`

### 7. 更新运动记录

`PUT /api/exercise-records/{id}`

```json
{
  "durationMinutes": 40,
  "intensityLevel": "HIGH"
}
```

### 8. 删除运动记录

`DELETE /api/exercise-records/{id}`

### 9. 查询某日汇总（净摄入口径）

`GET /api/users/1/daily-summary?date=2026-03-07`

`data` 字段核心结构：

```json
{
  "targetCalories": 1800,
  "dietCalories": 1650.00,
  "exerciseCalories": 320.00,
  "netCalories": 1330.00,
  "consumedCalories": 1330.00,
  "remainingCalories": 470.00,
  "records": [
    {
      "recordType": "DIET",
      "mealType": "LUNCH",
      "foodName": "米饭",
      "quantityInGram": 180,
      "totalCalories": 210
    },
    {
      "recordType": "EXERCISE",
      "exerciseName": "Jogging",
      "durationMinutes": 30,
      "intensityLevel": "MEDIUM",
      "totalCalories": 240
    }
  ]
}
```

### 10. 查询进度趋势（净摄入口径）

`GET /api/users/1/progress?startDate=2026-03-01&endDate=2026-03-07`

- 返回结构保持不变，`averageCalories/totalCalories/trend[].consumedCalories` 均表示净摄入热量。

## 小程序接入建议

- `app.onLaunch` 先执行 `wx.login -> /api/auth/wechat/login`，保存 `accessToken + userId`。
- 请求层统一自动附带 `Authorization`，401 时自动重登一次。
- 首页调用 `/api/users/{id}/daily-summary` 展示饮食摄入、运动消耗和净摄入。
- 记录页分两条入口：饮食记录（`/api/records`）与运动记录（`/api/exercise-records`）。
- 趋势页调用 `/api/users/{id}/progress` 展示净摄入趋势。