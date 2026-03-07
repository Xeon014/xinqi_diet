# 饮食记录应用后端

基于 Spring Boot 3.5.9、MyBatis-Plus、springdoc 2.8.15 和 MySQL 8.0.44 的饮食记录后端示例，包含用户、食品、饮食记录和热量/减脂进度统计等核心能力，适合作为小程序后端接口服务。

## 核心模块

- 用户模块：维护基础资料、每日热量目标、当前体重和目标体重。
- 食品模块：维护食品库，按每 100g 管理热量和三大营养素。
- 记录模块：记录每日摄入食物、重量和餐次，并自动计算总热量。
- 统计模块：按天汇总摄入热量，按时间区间输出热量趋势和减脂进度。

## 技术栈

- Java 17
- Spring Boot 3.5.9
- Spring Web
- MyBatis-Plus 3.5.7
- springdoc-openapi 2.8.15
- MySQL 8.0.44
- Bean Validation

## 数据库配置

应用默认连接本地 MySQL：

- Host: `127.0.0.1`
- Port: `3306`
- Database: `diet`
- Username: `xinqi_diet`
- Password: `XinqiDiet@2026!`

项目内已提供建库建账号脚本：[mysql-init.sql](/D:/IdeaProjects/diet/scripts/mysql-init.sql)。

## 运行方式

1. 先执行 MySQL 初始化脚本，创建数据库和专用账号。
2. 再启动应用：

```bash
mvn spring-boot:run
```

启动后可访问：

- 接口服务: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui/index.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

## 小程序接口约定

所有接口统一返回：

```json
{
  "code": "SUCCESS",
  "message": "ok",
  "data": {},
  "timestamp": "2026-03-07T23:40:00"
}
```

错误返回示例：

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Bad Request",
  "data": {
    "status": 400,
    "error": "Bad Request",
    "details": [
      "name: name must not be blank"
    ]
  },
  "timestamp": "2026-03-07T23:40:00"
}
```

列表接口不再直接返回数组，而是返回专门的列表对象：

- 用户列表：`data.users` + `data.total`
- 食品列表：`data.foods` + `data.total`
- 记录列表：`data.records` + `data.total`

详细说明见 [miniprogram-api.md](/D:/IdeaProjects/diet/docs/miniprogram-api.md)。

## 主要接口

### 用户

- `POST /api/users` 创建用户
- `GET /api/users` 查询用户列表
- `GET /api/users/{id}` 查询用户详情
- `PUT /api/users/{id}` 更新用户资料
- `GET /api/users/{id}/daily-summary?date=2026-03-07` 查询某日热量汇总
- `GET /api/users/{id}/progress?startDate=2026-03-01&endDate=2026-03-07` 查询减脂进度

### 食品

- `POST /api/foods` 创建食品
- `GET /api/foods?keyword=Chicken` 按关键字查询食品

### 记录

- `POST /api/records` 新增饮食记录
- `GET /api/records?userId=1&date=2026-03-07` 查询某用户某日饮食记录

## 示例请求

创建用户：

```json
POST /api/users
{
  "name": "李四",
  "email": "lisi@example.com",
  "dailyCalorieTarget": 1600,
  "currentWeight": 85.0,
  "targetWeight": 75.0
}
```

创建食品：

```json
POST /api/foods
{
  "name": "Brown Rice",
  "caloriesPer100g": 116,
  "proteinPer100g": 2.60,
  "carbsPer100g": 25.90,
  "fatPer100g": 0.90,
  "category": "Staple"
}
```

记录饮食：

```json
POST /api/records
{
  "userId": 1,
  "foodId": 1,
  "mealType": "LUNCH",
  "quantityInGram": 180,
  "recordDate": "2026-03-07"
}
```

## 初始化说明

- 应用启动时会自动执行 [schema.sql](/D:/IdeaProjects/diet/src/main/resources/schema.sql) 建表。
- 如果数据库为空，会自动初始化 1 个示例用户、3 个食品和 3 条当天饮食记录。

## 后续扩展建议

- 增加微信登录态、手机号绑定和用户隔离。
- 引入 Flyway 管理数据库版本变更。
- 增加体重日志、运动消耗、拍照识别录入等能力。
- 增加接口鉴权、限流和生产环境 OpenAPI 控制。
