package com.diet.domain.user;

import lombok.Getter;

@Getter
public enum GoalMode {
    LOSE(-300),
    MAINTAIN(0),
    GAIN(300);

    private final int defaultDelta;

    GoalMode(int defaultDelta) {
        this.defaultDelta = defaultDelta;
    }

}
