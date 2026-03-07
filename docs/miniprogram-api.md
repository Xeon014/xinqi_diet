# 小程序接口对接说明

## 基础约定

- 所有接口统一使用 `/api` 作为前缀。
- 所有响应统一使用 `ApiResponse<T>`。
- 小程序侧优先判断 HTTP 状态码，其次判断 `code` 是否为 `SUCCESS`。

统一响应结构：

```json
{
  "code": "SUCCESS",
  "message": "ok",
  "data": {},
  "timestamp": "2026-03-07T23:40:00"
}
```

## 各接口 data 结构

### 1. 查询用户列表

`GET /api/users`

```json
{
  "code": "SUCCESS",
  "message": "ok",
  "data": {
    "users": [
      {
        "id": 1,
        "name": "李四",
        "gender": "FEMALE",
        "age": 28,
        "height": 165.0,
        "activityLevel": "LIGHT",
        "dailyCalorieTarget": 1600,
        "currentWeight": 58.5,
        "targetWeight": 52.0,
        "bmr": 1325.25,
        "tdee": 1822.22,
        "createdAt": "2026-03-07T23:40:00"
      }
    ],
    "total": 1
  },
  "timestamp": "2026-03-07T23:40:00"
}
```

### 2. 查询食品列表

`GET /api/foods?keyword=Rice`

```json
{
  "code": "SUCCESS",
  "message": "ok",
  "data": {
    "foods": [],
    "total": 0
  },
  "timestamp": "2026-03-07T23:40:00"
}
```

### 3. 查询某日饮食记录

`GET /api/records?userId=1&date=2026-03-07`

```json
{
  "code": "SUCCESS",
  "message": "ok",
  "data": {
    "userId": 1,
    "date": "2026-03-07",
    "records": [],
    "total": 0
  },
  "timestamp": "2026-03-07T23:40:00"
}
```

### 4. 查询某日汇总

`GET /api/users/1/daily-summary?date=2026-03-07`

`data` 直接为 `DailySummaryResponse`。

### 5. 查询进度趋势

`GET /api/users/1/progress?startDate=2026-03-01&endDate=2026-03-07`

`data` 直接为 `ProgressSummaryResponse`。

### 6. 更新用户资料

`PUT /api/users/1`

```json
{
  "name": "李四",
  "gender": "FEMALE",
  "age": 28,
  "height": 165.0,
  "activityLevel": "LIGHT",
  "dailyCalorieTarget": 1600,
  "currentWeight": 58.5,
  "targetWeight": 52.0
}
```

## 小程序接入建议

- 首页：调用 `/api/users/{id}/daily-summary` 展示当天摄入概览。
- 资料页：调用 `/api/users/{id}` 展示并编辑用户资料，同时展示 `bmr` 与 `tdee`。
- 食品搜索页：调用 `/api/foods?keyword=` 做本地输入联想。
- 记录页：先拉食品列表，再调用 `/api/records` 提交饮食记录。
- 趋势页：调用 `/api/users/{id}/progress` 直接绘制折线图。