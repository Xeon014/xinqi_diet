ALTER TABLE user_profile
    ADD COLUMN goal_mode VARCHAR(20) NULL COMMENT '热量目标模式' AFTER custom_tdee,
    ADD COLUMN goal_calorie_delta INT NULL COMMENT '目标热量差值 kcal' AFTER goal_mode;

UPDATE user_profile
SET goal_mode = 'MAINTAIN',
    goal_calorie_delta = 0
WHERE goal_mode IS NULL
   OR goal_calorie_delta IS NULL;
