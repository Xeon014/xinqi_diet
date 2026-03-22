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

function toWeightLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '--';
  }
  return number.toFixed(1).replace(/\.0$/, '');
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

function getDefaultPreviewNoticeText(settings) {
  return settings && settings.goalCalorieStrategy === 'MANUAL'
    ? '按手动目标展示方案预览。'
    : '按当前目标生成智能推荐。';
}

function getIdlePreviewNoticeText(currentWeight, settings) {
  const targetWeight = toPositiveNumber(settings && settings.targetWeight);
  if (targetWeight == null || !Number.isFinite(targetWeight) || targetWeight <= 0) {
    return '补全目标体重后自动生成。';
  }
  if (shouldRequireGoalDate(currentWeight, settings) && !isFutureGoalDate(settings && settings.goalTargetDate)) {
    return '请设置至少 7 天后的日期。';
  }
  if (settings && settings.goalCalorieStrategy === 'MANUAL') {
    const dailyCalorieTarget = toPositiveNumber(settings.dailyCalorieTarget);
    if (dailyCalorieTarget == null || !Number.isFinite(dailyCalorieTarget) || dailyCalorieTarget <= 0) {
      return '请先设置目标热量。';
    }
  }
  return getDefaultPreviewNoticeText(settings);
}

function createGoalPreviewState(options) {
  const config = options || {};
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
    noticeText: config.noticeText || getDefaultPreviewNoticeText(config.settings),
    noticeTone: config.noticeTone || 'tip',
  };
}

function getLoadingPreviewNoticeText(settings) {
  return settings && settings.goalCalorieStrategy === 'MANUAL'
    ? '正在更新手动方案...'
    : '正在生成智能推荐...';
}

function buildGoalPreviewState(preview, settings) {
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
  const warningMessage = preview && preview.warningMessage ? preview.warningMessage : '';
  const trendHint = preview && preview.usedTrendAdjustment ? '已结合最近体重变化做微调' : '';
  return {
    status: 'ready',
    raw: preview,
    targetCaloriesLabel: preview && preview.recommendedDailyCalorieTarget != null
      ? String(toInteger(preview.recommendedDailyCalorieTarget)) + ' kcal/天'
      : '--',
    deltaLabel,
    weeklyLabel,
    warningLevel: preview && preview.warningLevel ? preview.warningLevel : 'NONE',
    warningMessage,
    trendHint,
    errorMessage: '',
    noticeText: warningMessage || trendHint || getDefaultPreviewNoticeText(settings),
    noticeTone: warningMessage ? 'warning' : 'tip',
  };
}

function getDraftCustomBmr(settings) {
  const customBmr = toPositiveNumber(settings && settings.customBmr);
  if (customBmr == null || !Number.isFinite(customBmr) || customBmr <= 0) {
    return null;
  }
  return toInteger(customBmr);
}

function buildMetrics(profile, settings) {
  const draftCustomBmr = getDraftCustomBmr(settings);
  return {
    bmiLabel: toOneDecimal(profile.bmi),
    currentWeightLabel: toWeightLabel(profile.currentWeight),
    bmrLabel: draftCustomBmr != null
      ? String(draftCustomBmr)
      : (profile.bmr == null ? '--' : String(toInteger(profile.bmr))),
  };
}

function shouldRequireGoalDate(currentWeight, settings) {
  const currentWeightNumber = toPositiveNumber(currentWeight);
  const targetWeight = toPositiveNumber(settings.targetWeight);
  if (!Number.isFinite(currentWeightNumber) || !Number.isFinite(targetWeight)) {
    return false;
  }
  return Math.abs(currentWeightNumber - targetWeight) > 0.3;
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
      bmiLabel: '--',
      currentWeightLabel: '--',
      bmrLabel: '--',
    },
    settings: {
      targetWeight: '',
      goalTargetDate: '',
      goalCalorieStrategy: 'MANUAL',
      dailyCalorieTarget: '',
      customBmr: '',
    },
    goalPreview: createGoalPreviewState(),
    sheet: createEmptySheet(),
  },

  onShow() {
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
      settings: {
        targetWeight: profile.targetWeight == null ? '' : String(profile.targetWeight),
        goalTargetDate: profile.goalTargetDate || '',
        goalCalorieStrategy: profile.goalCalorieStrategy || 'MANUAL',
        dailyCalorieTarget: profile.dailyCalorieTarget == null ? '' : String(toInteger(profile.dailyCalorieTarget)),
        customBmr: profile.customBmr == null ? '' : String(toInteger(profile.customBmr)),
      },
      metrics: buildMetrics(profile, {
        customBmr: profile.customBmr == null ? '' : String(toInteger(profile.customBmr)),
      }),
      goalPreview: createGoalPreviewState(),
      sheet: createEmptySheet(),
    };
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
    if (value === 'MANUAL') {
      this.handleOpenTargetCalorieSheet();
      return;
    }
    this.setData({ 'settings.goalCalorieStrategy': value }, () => {
      this.scheduleGoalPreview(true);
    });
  },

  handleOpenTargetCalorieSheet() {
    this.setData({
      sheet: {
        visible: true,
        type: 'DAILY_CALORIE_TARGET',
        title: '目标热量设置',
        fieldLabel: '目标热量 (kcal/天)',
        currentValue: this.data.settings.dailyCalorieTarget || '--',
        inputValue: this.data.settings.dailyCalorieTarget || '',
        smartValue: '--',
        smartAvailable: false,
        hint: '仅更新当前页面预览，保存后才会生效。',
        saving: false,
      },
    });
  },

  buildPreviewPayload() {
    const profile = this.data.profile;
    const settings = this.data.settings;
    const currentWeight = toPositiveNumber(profile && profile.currentWeight);
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
    if (shouldRequireGoalDate(profile && profile.currentWeight, settings) && !isFutureGoalDate(settings.goalTargetDate)) {
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
    const customBmr = getDraftCustomBmr(settings);
    if (customBmr != null) {
      payload.customBmr = customBmr;
    } else if (profile.customBmr != null) {
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
      this.setData({
        goalPreview: createGoalPreviewState({
          noticeText: getIdlePreviewNoticeText(
            this.data.profile && this.data.profile.currentWeight,
            this.data.settings
          ),
          settings: this.data.settings,
        }),
      });
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
      goalPreview: Object.assign(
        createGoalPreviewState({
          noticeText: getLoadingPreviewNoticeText(this.data.settings),
          settings: this.data.settings,
        }),
        { status: 'loading' }
      ),
    });
    return previewGoalPlan(payload)
      .then((preview) => {
        if (this.goalPreviewRequestId !== requestId) {
          return preview;
        }
        this.setData({ goalPreview: buildGoalPreviewState(preview, this.data.settings) });
        return preview;
      })
      .catch((error) => {
        if (this.goalPreviewRequestId !== requestId) {
          return null;
        }
        this.setData({
          goalPreview: Object.assign(createGoalPreviewState({
            settings: this.data.settings,
          }), {
            status: 'error',
            errorMessage: pickErrorMessage(error),
            noticeText: pickErrorMessage(error),
            noticeTone: 'warning',
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
      currentWeight: profile.currentWeight,
    });
    this.setData({
      sheet: {
        visible: true,
        type: 'BMR',
        title: '基础代谢设置',
        fieldLabel: '基础代谢 (kcal/天)',
        currentValue: this.data.metrics.bmrLabel,
        inputValue: this.data.settings.customBmr || (this.data.metrics.bmrLabel === '--' ? '' : this.data.metrics.bmrLabel),
        smartValue: bmrEstimate == null ? '--' : String(bmrEstimate),
        smartAvailable: bmrEstimate != null,
        hint: bmrEstimate == null ? '仅更新当前页面，保存后生效。' : '推荐值按性别、年龄、身高、体重计算，保存后生效。',
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
      wx.showToast({
        title: this.data.sheet.type === 'DAILY_CALORIE_TARGET' ? '请输入目标热量' : '请输入正确 BMR',
        icon: 'none',
      });
      return;
    }
    if (this.data.sheet.type === 'DAILY_CALORIE_TARGET') {
      this.setData({
        'settings.goalCalorieStrategy': 'MANUAL',
        'settings.dailyCalorieTarget': String(toInteger(numberValue)),
        sheet: createEmptySheet(),
      }, () => {
        this.scheduleGoalPreview(true);
        wx.showToast({ title: '已更新方案预览', icon: 'success' });
      });
      return;
    }
    this.setData({
      'settings.customBmr': String(toInteger(numberValue)),
      'metrics.bmrLabel': String(toInteger(numberValue)),
      sheet: createEmptySheet(),
    }, () => {
      this.scheduleGoalPreview(true);
      wx.showToast({ title: '已更新当前页面', icon: 'success' });
    });
  },

  confirmExtremePreview(preview) {
    if (!preview || preview.warningLevel !== 'EXTREME') {
      return Promise.resolve(true);
    }
    const fallbackContent = this.data.settings.goalCalorieStrategy === 'MANUAL'
      ? '按当前目标热量执行会偏激进，建议先调高或重新确认目标热量。'
      : '按当前设置达到目标会比较激进，建议延后日期或调整目标体重。';
    return new Promise((resolve) => {
      wx.showModal({
        title: '目标可能过急',
        content: preview.warningMessage || '按当前设置达到目标会比较激进，建议延后日期或调整目标体重。',
        cancelText: '调整目标',
        confirmText: '仍然保存',
        title: '目标可能过激',
        content: preview.warningMessage || fallbackContent,
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
    const targetWeight = toPositiveNumber(settings.targetWeight);
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
    const customBmr = getDraftCustomBmr(settings);
    if (customBmr != null) {
      payload.customBmr = customBmr;
    }
    return payload;
  },

  handleSave() {
    const settings = this.data.settings;
    const currentWeight = toPositiveNumber(this.data.profile && this.data.profile.currentWeight);
    const targetWeight = toPositiveNumber(settings.targetWeight);
    if (currentWeight == null || !Number.isFinite(currentWeight) || currentWeight <= 0) {
      wx.showToast({ title: '请先完善当前体重', icon: 'none' });
      return;
    }
    if (targetWeight == null || !Number.isFinite(targetWeight) || targetWeight <= 0) {
      wx.showToast({ title: '请输入正确目标体重', icon: 'none' });
      return;
    }
    if (shouldRequireGoalDate(this.data.profile && this.data.profile.currentWeight, settings) && !isFutureGoalDate(settings.goalTargetDate)) {
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
      wx.showToast({ title: '请先完善档案和目标设置', icon: 'none' });
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

  handleOpenProgress() {
    wx.switchTab({ url: '/pages/progress/index' });
  },

  noop() {},
});
