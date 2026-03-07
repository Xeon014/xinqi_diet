CREATE TABLE IF NOT EXISTS user_profile (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户主键ID',
    name VARCHAR(50) NOT NULL COMMENT '用户昵称',
    email VARCHAR(100) NULL COMMENT '邮箱，微信生态下暂不使用，预留字段',
    daily_calorie_target INT NOT NULL COMMENT '每日目标热量，单位kcal',
    current_weight DECIMAL(5, 2) NOT NULL COMMENT '当前体重，单位kg',
    target_weight DECIMAL(5, 2) NOT NULL COMMENT '目标体重，单位kg',
    created_at DATETIME NOT NULL COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户资料表';

CREATE TABLE IF NOT EXISTS food (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '食物主键ID',
    name VARCHAR(80) NOT NULL COMMENT '食物名称',
    calories_per_100g DECIMAL(8, 2) NOT NULL COMMENT '每100克热量，单位kcal',
    protein_per_100g DECIMAL(8, 2) NOT NULL COMMENT '每100克蛋白质，单位g',
    carbs_per_100g DECIMAL(8, 2) NOT NULL COMMENT '每100克碳水，单位g',
    fat_per_100g DECIMAL(8, 2) NOT NULL COMMENT '每100克脂肪，单位g',
    category VARCHAR(120) COMMENT '食物分类',
    created_at DATETIME NOT NULL COMMENT '创建时间',
    UNIQUE KEY uk_food_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='食物基础信息表';

CREATE TABLE IF NOT EXISTS meal_record (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录主键ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    food_id BIGINT NOT NULL COMMENT '食物ID',
    meal_type VARCHAR(20) NOT NULL COMMENT '餐次类型',
    quantity_in_gram DECIMAL(8, 2) NOT NULL COMMENT '摄入重量，单位g',
    total_calories DECIMAL(10, 2) NOT NULL COMMENT '本次摄入总热量，单位kcal',
    record_date DATE NOT NULL COMMENT '记录日期',
    created_at DATETIME NOT NULL COMMENT '创建时间',
    KEY idx_meal_record_user_date (user_id, record_date),
    KEY idx_meal_record_food (food_id),
    CONSTRAINT fk_meal_record_user FOREIGN KEY (user_id) REFERENCES user_profile(id),
    CONSTRAINT fk_meal_record_food FOREIGN KEY (food_id) REFERENCES food(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='饮食记录表';