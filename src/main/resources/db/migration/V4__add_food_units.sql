SET @ddl = (
    SELECT IF(
        EXISTS(
            SELECT 1
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'food'
              AND COLUMN_NAME = 'calorie_unit'
        ),
        'SELECT 1',
        'ALTER TABLE food ADD COLUMN calorie_unit VARCHAR(10) NOT NULL DEFAULT ''KCAL'' COMMENT ''热量单位'' AFTER calories_per_100g'
    )
);

PREPARE add_food_calorie_unit_stmt FROM @ddl;
EXECUTE add_food_calorie_unit_stmt;
DEALLOCATE PREPARE add_food_calorie_unit_stmt;

SET @ddl = (
    SELECT IF(
        EXISTS(
            SELECT 1
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'food'
              AND COLUMN_NAME = 'quantity_unit'
        ),
        'SELECT 1',
        'ALTER TABLE food ADD COLUMN quantity_unit VARCHAR(10) NOT NULL DEFAULT ''G'' COMMENT ''计量单位'' AFTER fat_per_100g'
    )
);

PREPARE add_food_quantity_unit_stmt FROM @ddl;
EXECUTE add_food_quantity_unit_stmt;
DEALLOCATE PREPARE add_food_quantity_unit_stmt;

UPDATE food
SET calorie_unit = 'KCAL'
WHERE calorie_unit IS NULL OR calorie_unit = '';

UPDATE food
SET quantity_unit = 'G'
WHERE quantity_unit IS NULL OR quantity_unit = '';
