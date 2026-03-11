CREATE TABLE IF NOT EXISTS user_profile (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户主键 ID',
    open_id VARCHAR(64) NULL COMMENT '微信 openid',
    union_id VARCHAR(64) NULL COMMENT '微信 unionid',
    name VARCHAR(50) NOT NULL COMMENT '用户显示名',
    nickname VARCHAR(80) NULL COMMENT '微信昵称',
    avatar_url VARCHAR(300) NULL COMMENT '微信头像地址',
    email VARCHAR(100) NULL COMMENT '邮箱（预留）',
    gender VARCHAR(10) NOT NULL COMMENT '性别',
    birth_date DATE NOT NULL COMMENT '生日',
    height DECIMAL(5, 2) NOT NULL COMMENT '身高 cm',
    activity_level VARCHAR(20) NOT NULL COMMENT '活动等级',
    daily_calorie_target INT NOT NULL COMMENT '每日目标 kcal',
    current_weight DECIMAL(5, 2) NOT NULL COMMENT '当前体重 kg',
    target_weight DECIMAL(5, 2) NOT NULL COMMENT '目标体重 kg',
    custom_bmr INT NULL COMMENT '自定义 BMR kcal',
    last_login_at DATETIME NULL COMMENT '最近登录时间',
    created_at DATETIME NOT NULL COMMENT '创建时间',
    UNIQUE KEY uk_user_profile_open_id (open_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户资料表';

CREATE TABLE IF NOT EXISTS food (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '食物主键 ID',
    name VARCHAR(80) NOT NULL COMMENT '食物名称',
    calories_per_100g DECIMAL(8, 2) NOT NULL COMMENT '每 100g 热量 kcal',
    protein_per_100g DECIMAL(8, 2) NOT NULL COMMENT '每 100g 蛋白质 g',
    carbs_per_100g DECIMAL(8, 2) NOT NULL COMMENT '每 100g 碳水 g',
    fat_per_100g DECIMAL(8, 2) NOT NULL COMMENT '每 100g 脂肪 g',
    category VARCHAR(120) COMMENT '分类',
    source VARCHAR(20) NOT NULL DEFAULT 'MANUAL' COMMENT '数据来源',
    source_ref VARCHAR(100) NULL COMMENT '来源主键',
    aliases VARCHAR(500) NULL COMMENT '别名',
    is_builtin TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否内置',
    sort_order INT NOT NULL DEFAULT 9999 COMMENT '分类排序',
    created_at DATETIME NOT NULL COMMENT '创建时间',
    UNIQUE KEY uk_food_name (name),
    KEY idx_food_category_sort (category, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='食物基础信息表';

CREATE TABLE IF NOT EXISTS meal_record (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录主键 ID',
    user_id BIGINT NOT NULL COMMENT '用户 ID',
    food_id BIGINT NOT NULL COMMENT '食物 ID',
    meal_type VARCHAR(20) NOT NULL COMMENT '餐次类型',
    quantity_in_gram DECIMAL(8, 2) NOT NULL COMMENT '摄入克重 g',
    total_calories DECIMAL(10, 2) NOT NULL COMMENT '本次摄入热量 kcal',
    record_date DATE NOT NULL COMMENT '记录日期',
    created_at DATETIME NOT NULL COMMENT '创建时间',
    KEY idx_meal_record_user_date (user_id, record_date),
    KEY idx_meal_record_food (food_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='饮食记录表';

CREATE TABLE IF NOT EXISTS exercise (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '运动主键 ID',
    name VARCHAR(80) NOT NULL COMMENT '运动名称',
    met_value DECIMAL(8, 2) NOT NULL COMMENT 'MET 值',
    category VARCHAR(80) NULL COMMENT '运动分类',
    source VARCHAR(20) NOT NULL DEFAULT 'MANUAL' COMMENT '数据来源',
    source_ref VARCHAR(100) NULL COMMENT '来源主键',
    aliases VARCHAR(500) NULL COMMENT '别名',
    is_builtin TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否内置',
    sort_order INT NOT NULL DEFAULT 9999 COMMENT '分类排序',
    created_at DATETIME NOT NULL COMMENT '创建时间',
    UNIQUE KEY uk_exercise_name (name),
    KEY idx_exercise_category_sort (category, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='运动库表';

CREATE TABLE IF NOT EXISTS exercise_record (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '运动记录主键 ID',
    user_id BIGINT NOT NULL COMMENT '用户 ID',
    exercise_id BIGINT NOT NULL COMMENT '运动 ID',
    duration_minutes INT NOT NULL COMMENT '时长（分钟）',
    intensity_level VARCHAR(20) NOT NULL COMMENT '强度等级',
    intensity_factor DECIMAL(5, 2) NOT NULL COMMENT '强度系数',
    weight_kg_snapshot DECIMAL(6, 2) NOT NULL COMMENT '记录时体重快照 kg',
    total_calories DECIMAL(10, 2) NOT NULL COMMENT '本次消耗热量 kcal',
    record_date DATE NOT NULL COMMENT '记录日期',
    created_at DATETIME NOT NULL COMMENT '创建时间',
    KEY idx_exercise_record_user_date (user_id, record_date),
    KEY idx_exercise_record_exercise (exercise_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='运动记录表';

CREATE TABLE IF NOT EXISTS health_diary (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '健康日记主键 ID',
    user_id BIGINT NOT NULL COMMENT '用户 ID',
    record_date DATE NOT NULL COMMENT '记录日期',
    content VARCHAR(500) NULL COMMENT '日记文字',
    image_file_ids TEXT NULL COMMENT '图片 fileID 列表 JSON',
    created_at DATETIME NOT NULL COMMENT '创建时间',
    updated_at DATETIME NOT NULL COMMENT '更新时间',
    UNIQUE KEY uk_health_diary_user_date (user_id, record_date),
    KEY idx_health_diary_user_date (user_id, record_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='健康日记表';

CREATE TABLE IF NOT EXISTS meal_combo (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '套餐主键 ID',
    user_id BIGINT NOT NULL COMMENT '用户 ID',
    name VARCHAR(50) NOT NULL COMMENT '套餐名称',
    description VARCHAR(200) NULL COMMENT '套餐说明',
    meal_type VARCHAR(20) NOT NULL COMMENT '默认餐次类型',
    created_at DATETIME NOT NULL COMMENT '创建时间',
    updated_at DATETIME NOT NULL COMMENT '更新时间',
    KEY idx_meal_combo_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户自定义套餐表';

CREATE TABLE IF NOT EXISTS meal_combo_item (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '套餐明细主键 ID',
    combo_id BIGINT NOT NULL COMMENT '套餐 ID',
    food_id BIGINT NOT NULL COMMENT '食物 ID',
    quantity_in_gram DECIMAL(8, 2) NOT NULL COMMENT '默认克重 g',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序序号',
    created_at DATETIME NOT NULL COMMENT '创建时间',
    KEY idx_meal_combo_item_combo (combo_id, sort_order),
    KEY idx_meal_combo_item_food (food_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户自定义套餐明细表';
