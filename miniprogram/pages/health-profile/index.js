const { getCurrentUser, updateProfile, previewGoalPlan } = require('../../services/user');
const { addDays, getToday } = require('../../utils/date');
const { pickErrorMessage } = require('../../utils/request');

const GOAL_STRATEGIES = [
  { label: '智能推荐', value: 'SMART' },
  { label: '手动设置', value: 'MANUAL' },
];

function toInteger(value) {
  return Math.round(Number(value || 0));
}

function toOneDecimal(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '--';
  }
  return number.toFixed(1);
}

function toPositiveNumber(rawValue) {
  const text = String(rawValue == null ? '' : rawValue).trim();
  if (!text) {
    return null;
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

function parseAge(birthDate) {
  if (!birthDate) {
    return null;
  }
  const today = new Date();
  const birth = new Date(birthDate + 'T00:00:00');
  if (Number.isNaN(birth.getTime()) || birth.getTime() > today.getTime()) {
    return null;
  }
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age < 0 ? null : age;
}

function calculateFormulaBmr(profileLike) {
  if (!profileLike || !profileLike.gender || !profileLike.birthDate) {
    return null;
  }
  const height = toPositiveNumber(profileLike.height);
  const currentWeight = toPositiveNumber(profileLike.currentWeight);
  const age = parseAge(profileLike.birthDate);
  if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(currentWeight) || currentWeight <= 0 || age == null) {
    return null;
  }
  const base = (currentWeight * 10) + (height * 6.25) - (age * 5);
  const offset = profileLike.gender === 'MALE' ? 5 : -161;
  return toInteger(base + offset);
}

function createEmptySheet() {
  return {
    visible: false,
    type: '',
    title: '',
    fieldLabel: '',
    currentValue: '--',
    inputValue: '',
    smartValue: '--',
    smartAvailable: false,
    hint: '',
    saving: false,
  };
}

function createGoalPreviewState() {
  return {
    status: 'idle',
    raw: null,
    targetCaloriesLabel: '--',
    deltaLabel: '--',
    weeklyLabel: '--',
    warningLevel: 'NONE',
    warningMessage: '',
    trendHint: '',
    errorMessage: '',
  };
}

function buildGoalPreviewState(preview) {
  const weeklyNumber = Number(preview && preview.plannedWeeklyChangeKg);
  const weeklyAbs = Number.isFinite(weeklyNumber) ? Math.abs(weeklyNumber).toFixed(2) : '--';
  let weeklyLabel = '维持';
  if (Number.isFinite(weeklyNumber) && weeklyNumber < 0) {
    weeklyLabel = '每周约减 ' + weeklyAbs + ' kg';
  } else if (Number.isFinite(weeklyNumber) && weeklyNumber > 0) {
    weeklyLabel = '每周约增 ' + weeklyAbs + ' kg';
  }
  const deltaNumber = Number(preview && preview.recommendedGoalCalorieDelta);
  let deltaLabel = '--';
  if (Number.isFinite(deltaNumber)) {
    deltaLabel = (deltaNumber > 0 ? '+' : '') + toInteger(deltaNumber) + ' kcal/天';
  }
  return {
    status: 'ready',
    raw: preview,
    targetCaloriesLabel: preview && preview.recommendedDailyCalorieTarget != null
      ? String(toInteger(preview.recommendedDailyCalorieTarget)) + ' kcal/天'
      : '--',
    deltaLabel,
    weeklyLabel,
    warningLevel: preview && preview.warningLevel ? preview.warningLevel : 'NONE',
    warningMessage: preview && preview.warningMessage ? preview.warningMessage : '',
    trendHint: preview && preview.usedTrendAdjustment ? '已结合最近体重变化做微调' : '',
    errorMessage: '',
  };
}

function buildMetrics(profile) {
  return {
    currentWeightLabel: profile.currentWeight == null ? '--' : String(profile.currentWeight),
    bmiLabel: toOneDecimal(profile.bmi),
    bmrLabel: profile.bmr == null ? '--' : String(toInteger(profile.bmr)),
    targetCaloriesLabel: profile.dailyCalorieTarget == null ? '--' : String(toInteger(profile.dailyCalorieTarget)),
  };
}

function shouldRequireGoalDate(settings) {
  const currentWeight = toPositiveNumber(settings.currentWeight);
  const targetWeight = toPositiveNumber(settings.targetWeight);
  if (!Number.isFinite(currentWeight) || !Number.isFinite(targetWeight)) {
    return false;
  }
  return Math.abs(currentWeight - targetWeight) > 0.1;
}

function isFutureGoalDate(goalTargetDate) {
  return goalTargetDate && goalTargetDate >= addDays(getToday(), 7);
}

Page({
  data: {
    profile: null,
    minGoalDate: addDays(getToday(), 7),
    goalStrategies: GOAL_STRATEGIES,
    metrics: {
      currentWeightLabel: '--',
      bmiLabel: '--',
      bmrLabel: '--',
      targetCaloriesLabel: '--',
    },
    settings: {
      currentWeight: '',
      targetWeight: '',
      goalTargetDate: '',
      goalCalorieStrategy: 'MANUAL',
      dailyCalorieTarget: '',
    },
    goalPreview: createGoalPreviewState(),
    sheet: createEmptySheet(),
  },

  onShow() {
    this.resetPageScroll();
    this.loadPageData();
  },

  onUnload() {
    if (this.goalPreviewTimer) {
      clearTimeout(this.goalPreviewTimer);
    }
  },

  onPullDownRefresh() {
    this.loadPageData(true);
  },

  loadPageData(stopPullDown) {
    getCurrentUser()
      .then((profile) => {
        this.setData(this.buildProfileViewData(profile));
        this.scheduleGoalPreview(true);
        this.resetPageScroll();
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: 'none' });
      })
      .finally(() => {
        if (stopPullDown) {
          wx.stopPullDownRefresh();
        }
      });
  },

  buildProfileViewData(profile) {
    return {
      profile,
      metrics: buildMetrics(profile),
      settings: {
        currentWeight: profile.currentWeight == null ? '' : String(profile.currentWeight),
        targetWeight: profile.targetWeight == null ? '' : String(profile.targetWeight),
        goalTargetDate: profile.goalTargetDate || '',
        goalCalorieStrategy: profile.goalCalorieStrategy || 'MANUAL',
        dailyCalorieTarget: profile.dailyCalorieTarget == null ? '' : String(toInteger(profile.dailyCalorieTarget)),
      },
      goalPreview: createGoalPreviewState(),
      sheet: createEmptySheet(),
    };
  },

  resetPageScroll() {
    wx.nextTick(() => {
      wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    });
  },

  handleInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ ['settings.' + field]: event.detail.value }, () => {
      this.scheduleGoalPreview();
    });
  },

  handleGoalDateChange(event) {
    this.setData({ 'settings.goalTargetDate': event.detail.value }, () => {
      this.scheduleGoalPreview(true);
    });
  },

  handleGoalStrategySelect(event) {
    const value = event.currentTarget.dataset.value;
    this.setData({ 'settings.goalCalorieStrategy': value }, () => {
      this.scheduleGoalPreview(true);
    });
  },

  buildPreviewPayload() {
    const profile = this.data.profile;
    const settings = this.data.settings;
    const currentWeight = toPositiveNumber(settings.currentWeight);
    const targetWeight = toPositiveNumber(settings.targetWeight);
    if (!profile || !profile.gender || !profile.birthDate || toPositiveNumber(profile.height) == null) {
      return null;
    }
    if (currentWeight == null || !Number.isFinite(currentWeight) || currentWeight <= 0) {
      return null;
    }
    if (targetWeight == null || !Number.isFinite(targetWeight) || targetWeight <= 0) {
      return null;
    }
    if (shouldRequireGoalDate(settings) && !isFutureGoalDate(settings.goalTargetDate)) {
      return null;
    }
    const payload = {
      gender: profile.gender,
      birthDate: profile.birthDate,
      height: toPositiveNumber(profile.height),
      currentWeight,
      targetWeight,
      goalCalorieStrategy: settings.goalCalorieStrategy,
    };
    if (settings.goalTargetDate) {
      payload.goalTargetDate = settings.goalTargetDate;
    }
    if (profile.customBmr != null) {
      payload.customBmr = profile.customBmr;
    }
    if (profile.customTdee != null) {
      payload.customTdee = profile.customTdee;
    }
    if (settings.goalCalorieStrategy === 'MANUAL') {
      const dailyCalorieTarget = toPositiveNumber(settings.dailyCalorieTarget);
      if (dailyCalorieTarget == null || !Number.isFinite(dailyCalorieTarget) || dailyCalorieTarget <= 0) {
        return null;
      }
      payload.dailyCalorieTarget = toInteger(dailyCalorieTarget);
    }
    return payload;
  },

  scheduleGoalPreview(immediate) {
    if (this.goalPreviewTimer) {
      clearTimeout(this.goalPreviewTimer);
    }
    this.goalPreviewTimer = setTimeout(() => {
      this.refreshGoalPreview();
    }, immediate ? 0 : 220);
  },

  refreshGoalPreview(force) {
    const payload = this.buildPreviewPayload();
    if (!payload) {
      this.setData({ goalPreview: createGoalPreviewState() });
      return Promise.resolve(null);
    }
    const signature = JSON.stringify(payload);
    if (!force && signature === this.lastGoalPreviewSignature && this.data.goalPreview.status === 'ready' && this.data.goalPreview.raw) {
      return Promise.resolve(this.data.goalPreview.raw);
    }
    this.lastGoalPreviewSignature = signature;
    const requestId = Date.now();
    this.goalPreviewRequestId = requestId;
    this.setData({
      goalPreview: Object.assign(createGoalPreviewState(), { status: 'loading' }),
    });
    return previewGoalPlan(payload)
      .then((preview) => {
        if (this.goalPreviewRequestId !== requestId) {
          return preview;
        }
        this.setData({ goalPreview: buildGoalPreviewState(preview) });
        return preview;
      })
      .catch((error) => {
        if (this.goalPreviewRequestId !== requestId) {
          return null;
        }
        this.setData({
          goalPreview: Object.assign(createGoalPreviewState(), {
            status: 'error',
            errorMessage: pickErrorMessage(error),
          }),
        });
        if (force) {
          wx.showToast({ title: pickErrorMessage(error), icon: 'none' });
        }
        return null;
      });
  },

  handleOpenBmrSheet() {
    const profile = this.data.profile || {};
    const bmrEstimate = calculateFormulaBmr({
      gender: profile.gender,
      birthDate: profile.birthDate,
      height: profile.height,
      currentWeight: this.data.settings.currentWeight || profile.currentWeight,
    });
    this.setData({
      sheet: {
        visible: true,
        type: 'BMR',
        title: '基础代谢设置',
        fieldLabel: '基础代谢 (kcal/天)',
        currentValue: this.data.metrics.bmrLabel,
        inputValue: this.data.metrics.bmrLabel === '--' ? '' : this.data.metrics.bmrLabel,
        smartValue: bmrEstimate == null ? '--' : String(bmrEstimate),
        smartAvailable: bmrEstimate != null,
        hint: bmrEstimate == null ? '请先完善生日、身高和当前体重。' : '可直接使用系统估算值。',
        saving: false,
      },
    });
  },

  handleCloseSheet() {
    if (this.data.sheet.saving) {
      return;
    }
    this.setData({ sheet: createEmptySheet() });
  },

  handleSheetInput(event) {
    this.setData({ 'sheet.inputValue': event.detail.value });
  },

  handleUseSmartValue() {
    if (!this.data.sheet.smartAvailable) {
      wx.showToast({ title: this.data.sheet.hint || '当前无法预估', icon: 'none' });
      return;
    }
    this.setData({ 'sheet.inputValue': this.data.sheet.smartValue });
  },

  handleSaveSheet() {
    const numberValue = toPositiveNumber(this.data.sheet.inputValue);
    if (numberValue == null || !Number.isFinite(numberValue) || numberValue <= 0) {
      wx.showToast({ title: '请输入正确 BMR', icon: 'none' });
      return;
    }
    this.setData({ 'sheet.saving': true });
    updateProfile({ customBmr: toInteger(numberValue) })
      .then((profile) => {
        this.setData(this.buildProfileViewData(profile));
        this.scheduleGoalPreview(true);
        wx.showToast({ title: '基础代谢已更新', icon: 'success' });
      })
      .catch((error) => {
        this.setData({ 'sheet.saving': false });
        wx.showToast({ title: pickErrorMessage(error), icon: 'none' });
      });
  },

  confirmExtremePreview(preview) {
    if (!preview || preview.warningLevel !== 'EXTREME') {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      wx.showModal({
        title: '目标可能过急',
        content: preview.warningMessage || '按当前设置达到目标会比较激进，建议延后日期或调整目标体重。',
        cancelText: '调整目标',
        confirmText: '仍然保存',
        success: (result) => resolve(!!result.confirm),
        fail: () => resolve(false),
      });
    });
  },

  buildSavePayload() {
    const settings = this.data.settings;
    const payload = {
      goalCalorieStrategy: settings.goalCalorieStrategy,
    };
    const currentWeight = toPositiveNumber(settings.currentWeight);
    const targetWeight = toPositiveNumber(settings.targetWeight);
    if (currentWeight != null && Number.isFinite(currentWeight) && currentWeight > 0) {
      payload.currentWeight = currentWeight;
    }
    if (targetWeight != null && Number.isFinite(targetWeight) && targetWeight > 0) {
      payload.targetWeight = targetWeight;
    }
    if (settings.goalTargetDate) {
      payload.goalTargetDate = settings.goalTargetDate;
    }
    if (settings.goalCalorieStrategy === 'MANUAL') {
      const dailyCalorieTarget = toPositiveNumber(settings.dailyCalorieTarget);
      if (dailyCalorieTarget != null && Number.isFinite(dailyCalorieTarget) && dailyCalorieTarget > 0) {
        payload.dailyCalorieTarget = toInteger(dailyCalorieTarget);
      }
    }
    return payload;
  },

  handleSave() {
    const settings = this.data.settings;
    const currentWeight = toPositiveNumber(settings.currentWeight);
    const targetWeight = toPositiveNumber(settings.targetWeight);
    if (currentWeight == null || !Number.isFinite(currentWeight) || currentWeight <= 0) {
      wx.showToast({ title: '请输入正确当前体重', icon: 'none' });
      return;
    }
    if (targetWeight == null || !Number.isFinite(targetWeight) || targetWeight <= 0) {
      wx.showToast({ title: '请输入正确目标体重', icon: 'none' });
      return;
    }
    if (shouldRequireGoalDate(settings) && !isFutureGoalDate(settings.goalTargetDate)) {
      wx.showToast({ title: '请设置至少 7 天后的日期', icon: 'none' });
      return;
    }
    if (settings.goalCalorieStrategy === 'MANUAL') {
      const dailyCalorieTarget = toPositiveNumber(settings.dailyCalorieTarget);
      if (dailyCalorieTarget == null || !Number.isFinite(dailyCalorieTarget) || dailyCalorieTarget <= 0) {
        wx.showToast({ title: '请输入目标热量', icon: 'none' });
        return;
      }
    }
    if (!this.buildPreviewPayload()) {
      wx.showToast({ title: '??????????????', icon: 'none' });
      return;
    }
    this.refreshGoalPreview(true)
      .then((preview) => this.confirmExtremePreview(preview).then((confirmed) => ({ confirmed })))
      .then((result) => {
        if (!result.confirmed) {
          return;
        }
        updateProfile(this.buildSavePayload())
          .then(() => {
            wx.showToast({ title: '保存成功', icon: 'success' });
            setTimeout(() => {
              wx.navigateBack();
            }, 320);
          })
          .catch((error) => {
            wx.showToast({ title: pickErrorMessage(error), icon: 'none' });
          });
      });
  },

  noop() {},
});