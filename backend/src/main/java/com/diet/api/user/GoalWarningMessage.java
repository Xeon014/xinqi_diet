package com.diet.api.user;

public enum GoalWarningMessage {

    MANUAL_BELOW_BMR("当前目标热量已低于基础代谢，建议提高目标热量。"),

    MANUAL_WEEKLY_LOSS_TOO_FAST("按当前计划每周减重偏快，建议提高目标热量。"),

    MANUAL_WEEKLY_GAIN_TOO_FAST("按当前计划每周增重偏快，建议重新确认目标热量。"),

    MANUAL_DAILY_DEFICIT_TOO_LARGE("当前每日热量缺口偏大，建议提高目标热量。"),

    MANUAL_DAILY_SURPLUS_TOO_LARGE("当前每日热量盈余偏大，建议重新确认目标热量。"),

    SMART_BELOW_BMR("当前目标热量已低于基础代谢，建议放宽目标日期。"),

    SMART_WEEKLY_LOSS_TOO_FAST("按当前计划每周减重偏快，建议放宽目标日期。"),

    SMART_WEEKLY_GAIN_TOO_FAST("按当前计划每周增重偏快，建议重新确认目标。"),

    SMART_DAILY_DEFICIT_TOO_LARGE("当前每日热量缺口偏大，建议放宽目标日期。"),

    SMART_DAILY_SURPLUS_TOO_LARGE("当前每日热量盈余偏大，建议重新确认目标。");

    private final String text;

    GoalWarningMessage(String text) {
        this.text = text;
    }

    public String text() {
        return text;
    }
}
