SET @ddl = (
    SELECT IF(
        EXISTS(
            SELECT 1
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'meal_combo'
              AND COLUMN_NAME = 'meal_type'
        ),
        'ALTER TABLE meal_combo DROP COLUMN meal_type',
        'SELECT 1'
    )
);

PREPARE drop_meal_combo_meal_type_stmt FROM @ddl;
EXECUTE drop_meal_combo_meal_type_stmt;
DEALLOCATE PREPARE drop_meal_combo_meal_type_stmt;
