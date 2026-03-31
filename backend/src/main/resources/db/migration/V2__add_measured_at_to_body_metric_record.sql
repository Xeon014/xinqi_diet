ALTER TABLE body_metric_record
    ADD COLUMN measured_at DATETIME NULL COMMENT '业务测量时间' AFTER record_date;

UPDATE body_metric_record
SET measured_at = TIMESTAMP(record_date, TIME(created_at))
WHERE measured_at IS NULL;

ALTER TABLE body_metric_record
    MODIFY COLUMN measured_at DATETIME NOT NULL COMMENT '业务测量时间';

ALTER TABLE body_metric_record
    DROP INDEX idx_body_metric_user_type_date,
    ADD KEY idx_body_metric_user_type_measured (user_id, metric_type, measured_at, id),
    ADD KEY idx_body_metric_user_type_date_measured (user_id, metric_type, record_date, measured_at, id);
