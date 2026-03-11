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

### 0. 更新用户资料（按字段部分更新）

`PUT /api/users/{userId}`

说明：

- 只更新请求体中传入的字段；未传字段保持原值。
- `useFormulaBmr=true` 时后端会清空 `customBmr`，改为公式计算口径。
- 字段可不填，不要求一次性补齐。

请求示例：

```json
{
  "name": "小林",
  "height": 168.5,
  "currentWeight": 58.2,
  "useFormulaBmr": true
}
```

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

### 11. 查询某日健康日记

`GET /api/health-diaries/daily?date=2026-03-11`

响应（无记录时 `data` 为 `null`）：

```json
{
  "code": "SUCCESS",
  "message": "ok",
  "data": {
    "id": 12,
    "userId": 1,
    "recordDate": "2026-03-11",
    "content": "今天饮食节奏稳定，状态不错。",
    "imageFileIds": [
      "cloud://xxx/health-diary/1/2026-03-11/a.jpg"
    ],
    "createdAt": "2026-03-11T10:20:30",
    "updatedAt": "2026-03-11T10:20:30"
  },
  "timestamp": "2026-03-11T10:20:30"
}
```

### 12. 保存某日健康日记（新建或覆盖）

`PUT /api/health-diaries/daily`

请求：

```json
{
  "recordDate": "2026-03-11",
  "content": "今天饮食节奏稳定，状态不错。",
  "imageFileIds": [
    "cloud://xxx/health-diary/1/2026-03-11/a.jpg"
  ]
}
```

响应：

```json
{
  "code": "SUCCESS",
  "message": "ok",
  "data": {
    "diary": {
      "id": 12,
      "userId": 1,
      "recordDate": "2026-03-11",
      "content": "今天饮食节奏稳定，状态不错。",
      "imageFileIds": [
        "cloud://xxx/health-diary/1/2026-03-11/a.jpg"
      ],
      "createdAt": "2026-03-11T10:20:30",
      "updatedAt": "2026-03-11T10:20:30"
    },
    "removedImageFileIds": []
  },
  "timestamp": "2026-03-11T10:20:30"
}
```

### 13. 删除某日健康日记

`DELETE /api/health-diaries/daily?date=2026-03-11`

响应：

```json
{
  "code": "SUCCESS",
  "message": "ok",
  "data": {
    "deleted": true,
    "removedImageFileIds": [
      "cloud://xxx/health-diary/1/2026-03-11/a.jpg"
    ]
  },
  "timestamp": "2026-03-11T10:20:30"
}
```

## 小程序接入建议

- `app.onLaunch` 先执行 `wx.login -> /api/auth/wechat/login`，保存 `accessToken + userId`。
- 请求层统一自动附带 `Authorization`，401 时自动重登一次。
- 首页调用 `/api/users/{id}/daily-summary` 展示饮食摄入、运动消耗和净摄入。
- 记录页分两条入口：饮食记录（`/api/records`）与运动记录（`/api/exercise-records`）。
- 趋势页调用 `/api/users/{id}/progress` 展示净摄入趋势。
- 首页在记录区下方展示“健康日记”入口与当日摘要，点击进入独立编辑页。
