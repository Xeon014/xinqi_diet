CREATE TABLE IF NOT EXISTS user_profile (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户主键 ID',
    open_id VARCHAR(64) NULL COMMENT '微信 openid',
    union_id VARCHAR(64) NULL COMMENT '微信 unionid',
    name VARCHAR(50) NOT NULL COMMENT '用户昵称',
    nickname VARCHAR(80) NULL COMMENT '微信昵称',
    avatar_url VARCHAR(300) NULL COMMENT '微信头像地址',
    email VARCHAR(100) NULL COMMENT '邮箱，微信生态下暂不使用，预留字段',
    gender VARCHAR(10) NOT NULL COMMENT '性别',
    birth_date DATE NOT NULL COMMENT '生日',
    height DECIMAL(5, 2) NOT NULL COMMENT '身高，单位 cm',
    activity_level VARCHAR(20) NOT NULL COMMENT '活动量等级',
    daily_calorie_target INT NOT NULL COMMENT '每日目标热量，单位 kcal',
    current_weight DECIMAL(5, 2) NOT NULL COMMENT '当前体重，单位 kg',
    target_weight DECIMAL(5, 2) NOT NULL COMMENT '目标体重，单位 kg',
    custom_bmr INT NULL COMMENT '用户自定义基础代谢，单位 kcal',
    last_login_at DATETIME NULL COMMENT '最近登录时间',
    created_at DATETIME NOT NULL COMMENT '创建时间',
    UNIQUE KEY uk_user_profile_open_id (open_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户资料表';

CREATE TABLE IF NOT EXISTS food (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '食物主键 ID',
    name VARCHAR(80) NOT NULL COMMENT '食物名称',
    calories_per_100g DECIMAL(8, 2) NOT NULL COMMENT '每 100 克热量，单位 kcal',
    protein_per_100g DECIMAL(8, 2) NOT NULL COMMENT '每 100 克蛋白质，单位 g',
    carbs_per_100g DECIMAL(8, 2) NOT NULL COMMENT '每 100 克碳水，单位 g',
    fat_per_100g DECIMAL(8, 2) NOT NULL COMMENT '每 100 克脂肪，单位 g',
    category VARCHAR(120) COMMENT '食物分类',
    source VARCHAR(20) NOT NULL DEFAULT 'MANUAL' COMMENT '数据来源',
    source_ref VARCHAR(100) NULL COMMENT '来源数据主键',
    aliases VARCHAR(500) NULL COMMENT '同义词，逗号分隔',
    is_builtin TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否内置食物',
    created_at DATETIME NOT NULL COMMENT '创建时间',
    UNIQUE KEY uk_food_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='食物基础信息表';

CREATE TABLE IF NOT EXISTS meal_record (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录主键 ID',
    user_id BIGINT NOT NULL COMMENT '用户 ID',
    food_id BIGINT NOT NULL COMMENT '食物 ID',
    meal_type VARCHAR(20) NOT NULL COMMENT '餐次类型',
    quantity_in_gram DECIMAL(8, 2) NOT NULL COMMENT '摄入重量，单位 g',
    total_calories DECIMAL(10, 2) NOT NULL COMMENT '本次摄入总热量，单位 kcal',
    record_date DATE NOT NULL COMMENT '记录日期',
    created_at DATETIME NOT NULL COMMENT '创建时间',
    KEY idx_meal_record_user_date (user_id, record_date),
    KEY idx_meal_record_food (food_id),
    CONSTRAINT fk_meal_record_user FOREIGN KEY (user_id) REFERENCES user_profile(id),
    CONSTRAINT fk_meal_record_food FOREIGN KEY (food_id) REFERENCES food(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='饮食记录表';
