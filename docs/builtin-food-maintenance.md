# 内置食物初始化与维护方案

## 1. 总原则

- 应用启动时不自动导入内置食物。
- 生产环境内置食物只允许手工生成 SQL、手工执行 SQL。
- 正式上线后，不再物理删除既有内置食物。
- 内置食物以 `food.source_ref` 作为稳定身份，后续维护按 `source_ref` 更新。

## 2. 数据来源

- 原始营养源：`scripts/data/food_nutrition.csv`
- 中国成分表精选清单：`scripts/data/builtin-food-selection.tsv`
- 手工补充清单：`scripts/data/builtin-food-manual.tsv`

规则：

- `builtin-food-selection.tsv` 只放可以稳定映射到 `food_nutrition.csv` 的词条。
- `builtin-food-manual.tsv` 只放当前仍需保留、但无法直接由中国成分表稳定覆盖的词条。
- 手工清单必须显式维护 `sourceRef` 与 `sortOrder`，禁止依赖脚本按顺序自动生成身份。

## 3. 生成产物

执行命令：

```powershell
node scripts/generate-builtin-food-seed.js
```

生成结果：

- `scripts/sql/bootstrap-builtin-foods-latest.sql`
- `scripts/sql/sync-builtin-foods-latest.sql`

含义：

- `bootstrap`：首次初始化用，可删除当前全部内置食物后重建。
- `sync`：正式上线后日常维护用，只更新已有词条并补充新词条。

## 4. 首次初始化

适用场景：

- 空库首次上线
- 还未正式发布、允许重置内置食物数据的预发布环境

步骤：

1. 确认清单内容无误
2. 执行 `node scripts/generate-builtin-food-seed.js`
3. 手工执行 `scripts/sql/bootstrap-builtin-foods-latest.sql`
4. 检查 `/api/foods` 与小程序食物搜索页

## 5. 正式上线后维护

正式上线后，只允许这条流程：

1. 修改 `builtin-food-selection.tsv` 或 `builtin-food-manual.tsv`
2. 重新执行 `node scripts/generate-builtin-food-seed.js`
3. 手工执行 `scripts/sql/sync-builtin-foods-latest.sql`
4. 验证接口与小程序展示

上线后维护约束：

- 不执行 `bootstrap-builtin-foods-latest.sql`
- 不删除已发布内置食物
- 允许修改名称、别名、分类、营养值、排序
- 允许新增新词条

## 6. 数据库约束

- `food.source_ref` 必须唯一
- 内置食物查询以 `is_builtin = 1` 识别
- 历史记录、套餐记录继续通过 `food.id` 关联，因此上线后不能靠删除重建变更 `id`

## 7. 回归检查

- 生成脚本校验通过：`node scripts/generate-builtin-food-seed.js --check`
- 分类分布与条目数符合预期
- `/api/foods` 搜索和分类筛选正常
- 小程序食物搜索页能正常展示并记录
- 已存在的饮食记录、套餐记录不受影响
