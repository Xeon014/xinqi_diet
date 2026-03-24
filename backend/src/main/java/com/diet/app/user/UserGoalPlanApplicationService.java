package com.diet.app.user;

import com.diet.domain.user.UserProfile;
import com.diet.api.user.GoalPlanPreviewResponse;
import com.diet.api.user.UpdateUserRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class UserGoalPlanApplicationService {

    private final GoalPlanningService goalPlanningService;

    private final UserProfileSupport userProfileSupport;

    public UserGoalPlanApplicationService(
            GoalPlanningService goalPlanningService,
            UserProfileSupport userProfileSupport
    ) {
        this.goalPlanningService = goalPlanningService;
        this.userProfileSupport = userProfileSupport;
    }

    public GoalPlanPreviewResponse previewGoalPlan(Long id, UpdateUserRequest request) {
        UserProfile user = userProfileSupport.getUser(id);
        return goalPlanningService.preview(userProfileSupport.buildGoalPlanningProfile(user, request));
    }
}
