ALTER TABLE user_profile
    ADD COLUMN custom_protein_target INT NULL COMMENT '自定义蛋白目标 g/天' AFTER custom_tdee;
