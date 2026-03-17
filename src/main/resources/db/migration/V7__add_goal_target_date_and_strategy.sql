ALTER TABLE user_profile
    ADD COLUMN goal_target_date DATE NULL COMMENT '预期达到目标体重的日期' AFTER goal_calorie_delta,
    ADD COLUMN goal_calorie_strategy VARCHAR(20) NOT NULL DEFAULT 'MANUAL' COMMENT '目标热量策略' AFTER goal_target_date;

UPDATE user_profile
SET goal_calorie_strategy = 'MANUAL'
WHERE goal_calorie_strategy IS NULL
   OR goal_calorie_strategy = '';
