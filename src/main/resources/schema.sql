CREATE TABLE IF NOT EXISTS user_profile (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    daily_calorie_target INT NOT NULL,
    current_weight DECIMAL(5, 2) NOT NULL,
    target_weight DECIMAL(5, 2) NOT NULL,
    created_at DATETIME NOT NULL,
    UNIQUE KEY uk_user_profile_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS food (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(80) NOT NULL,
    calories_per_100g DECIMAL(8, 2) NOT NULL,
    protein_per_100g DECIMAL(8, 2) NOT NULL,
    carbs_per_100g DECIMAL(8, 2) NOT NULL,
    fat_per_100g DECIMAL(8, 2) NOT NULL,
    category VARCHAR(120),
    created_at DATETIME NOT NULL,
    UNIQUE KEY uk_food_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS meal_record (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    food_id BIGINT NOT NULL,
    meal_type VARCHAR(20) NOT NULL,
    quantity_in_gram DECIMAL(8, 2) NOT NULL,
    total_calories DECIMAL(10, 2) NOT NULL,
    record_date DATE NOT NULL,
    created_at DATETIME NOT NULL,
    KEY idx_meal_record_user_date (user_id, record_date),
    KEY idx_meal_record_food (food_id),
    CONSTRAINT fk_meal_record_user FOREIGN KEY (user_id) REFERENCES user_profile(id),
    CONSTRAINT fk_meal_record_food FOREIGN KEY (food_id) REFERENCES food(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;