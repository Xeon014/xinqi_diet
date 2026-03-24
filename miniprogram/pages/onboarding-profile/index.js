const { updateProfile, previewGoalPlan } = require('../../services/user');
const { getCurrentUserId } = require('../../utils/auth');
const { addDays, getToday } = require('../../utils/date');
const { pickErrorMessage } = require('../../utils/request');

const STEPS = [
  { key: 'basic', title: '基础信息', description: '', optional: false },
  { key: 'body', title: '身体数据', description: '', optional: false },
  { key: 'bmr', title: '基础代谢 BMR', description: '推荐值按性别、年龄、身高、体重计算。', optional: false },
  { key: 'goalTarget', title: '目标体重与预期日期', description: '建议设置目标体重。', optional: true },
  { key: 'goalPlan', title: '目标计划', description: '', optional: true },
];

const GENDER_OPTIONS = [
  { label: '女', value: 'FEMALE' },
  { label: '男', value: 'MALE' },
];

const GOAL_STRATEGIES = [
  { label: '智能推荐', value: 'SMART' },
  { label: '手动设置', value: 'MANUAL' },
];

const MANUAL_ONLY_STRATEGY = [GOAL_STRATEGIES[1]];

function toInteger(value) {
  return Math.round(Number(value || 0));
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

function calculateFormulaBmr(form) {
  if (!form || !form.gender || !form.birthDate) {
    return null;
  }

  const height = toPositiveNumber(form.height);
  const weight = toPositiveNumber(form.currentWeight);
  const age = parseAge(form.birthDate);
  if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(weight) || weight <= 0 || age == null) {
    return null;
  }

  const base = (weight * 10) + (height * 6.25) - (age * 5);
  const offset = form.gender === 'MALE' ? 5 : -161;
  return toInteger(base + offset);
}

function hasTargetWeight(form) {
  const targetWeight = toPositiveNumber(form && form.targetWeight);
  return Number.isFinite(targetWeight) && targetWeight > 0;
}

function canUseSmartGoalPlan(form) {
  return hasTargetWeight(form);
}

function getVisibleGoalStrategies(form) {
  return canUseSmartGoalPlan(form) ? GOAL_STRATEGIES : MANUAL_ONLY_STRATEGY;
}

function getEffectiveGoalStrategy(form) {
  return canUseSmartGoalPlan(form) ? form.goalCalorieStrategy : 'MANUAL';
}

function buildGoalPreviewTitle(strategy) {
  return strategy === 'MANUAL' ? '当前手动目标' : '智能推荐目标';
}

function createGoalPreviewState(strategy) {
  return {
    status: 'idle',
    raw: null,
    title: buildGoalPreviewTitle(strategy),
    targetCaloriesLabel: '--',
    deltaLabel: '--',
    weeklyLabel: '--',
    warningLevel: 'NONE',
    warningMessage: '',
    trendHint: '',
    errorMessage: '',
  };
}

function buildGoalPreviewState(preview, strategy) {
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
    title: buildGoalPreviewTitle(strategy),
    targetCaloriesLabel: preview && preview.recommendedDailyCalorieTarget != null
      ? String(toInteger(preview.recommendedDailyCalorieTarget)) + ' kcal/天'
      : '--',
    deltaLabel,
    weeklyLabel,
    warningLevel: preview && preview.warningLevel ? preview.warningLevel : 'NONE',
    warningMessage: preview && preview.warningMessage ? preview.warningMessage : '',
    trendHint: strategy === 'SMART' && preview && preview.usedTrendAdjustment ? '已结合最近体重变化做微调' : '',
    errorMessage: '',
  };
}

function shouldRequireGoalDate(form) {
  const currentWeight = toPositiveNumber(form && form.currentWeight);
  const targetWeight = toPositiveNumber(form && form.targetWeight);
  if (!Number.isFinite(currentWeight) || !Number.isFinite(targetWeight)) {
    return false;
  }
  return Math.abs(currentWeight - targetWeight) > 0.3;
}

function isFutureGoalDate(goalTargetDate) {
  return goalTargetDate && goalTargetDate >= addDays(getToday(), 7);
}

function buildProgressPercent(stepIndex) {
  return Math.round(((stepIndex + 1) / STEPS.length) * 100);
}

Page({
  data: {
    minGoalDate: addDays(getToday(), 7),
    steps: STEPS,
    currentStep: 0,
    progressPercent: buildProgressPercent(0),
    genderOptions: GENDER_OPTIONS,
    goalStrategiesVisible: MANUAL_ONLY_STRATEGY,
    submitting: false,
    formulaBmrPreview: '--',
    bmrHint: '',
    birthDateColumns: [[], [], []],
    birthDateColumnIndex: [0, 0, 0],
    birthDateDisplay: '',
    goalPreview: createGoalPreviewState('MANUAL'),
    form: {
      gender: '',
      birthDate: '',
      height: '',
      currentWeight: '',
      bmr: '',
      targetWeight: '',
      goalTargetDate: '',
      dailyCalorieTarget: '',
      goalCalorieStrategy: 'MANUAL',
    },
  },

  onLoad() {
    this.initBirthDateColumns();
    this.refreshDerivedState();
  },

  onUnload() {
    if (this.goalPreviewTimer) {
      clearTimeout(this.goalPreviewTimer);
    }
  },

  initBirthDateColumns() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const years = [];
    for (let year = 1940; year <= currentYear; year += 1) {
      years.push(String(year));
    }
    const months = [];
    for (let month = 1; month <= 12; month += 1) {
      months.push(String(month));
    }
    const days = [];
    for (let day = 1; day <= 31; day += 1) {
      days.push(String(day));
    }

    const defaultYearIndex = Math.max(0, years.indexOf(String(currentYear - 25)));
    this.setData({
      'birthDateColumns[0]': years,
      'birthDateColumns[1]': months,
      'birthDateColumns[2]': days,
      birthDateColumnIndex: [defaultYearIndex, 0, 0],
    });
    this.updateBirthDateDays(defaultYearIndex, 0);
  },

  updateBirthDateDays(yearIndex, monthIndex) {
    const years = this.data.birthDateColumns[0];
    const months = this.data.birthDateColumns[1];
    if (!years.length || !months.length) {
      return;
    }

    const year = parseInt(years[yearIndex] || years[0], 10);
    const month = parseInt(months[monthIndex] || months[0], 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(String(day));
    }
    this.setData({ 'birthDateColumns[2]': days });
  },

  refreshDerivedState(callback) {
    const nextForm = this.data.form;
    const formulaBmr = calculateFormulaBmr(nextForm);
    const nextStrategy = getEffectiveGoalStrategy(nextForm);
    this.setData({
      formulaBmrPreview: formulaBmr == null ? '--' : String(formulaBmr),
      bmrHint: '',
      goalStrategiesVisible: getVisibleGoalStrategies(nextForm),
      'form.goalCalorieStrategy': nextStrategy,
      goalPreview: createGoalPreviewState(nextStrategy),
    }, callback);
  },

  setCurrentStep(nextStep, callback) {
    this.setData({
      currentStep: nextStep,
      progressPercent: buildProgressPercent(nextStep),
    }, callback);
  },

  handleInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ ['form.' + field]: event.detail.value }, () => {
      this.refreshDerivedState(() => {
        this.scheduleGoalPreview();
      });
    });
  },

  handleGenderSelect(event) {
    const value = event.currentTarget.dataset.value;
    this.setData({ 'form.gender': value }, () => {
      this.refreshDerivedState(() => {
        this.scheduleGoalPreview();
      });
    });
  },

  handleGoalStrategySelect(event) {
    const value = event.currentTarget.dataset.value;
    this.setData({ 'form.goalCalorieStrategy': value }, () => {
      this.refreshDerivedState(() => {
        this.scheduleGoalPreview(true);
      });
    });
  },

  handleGoalDateChange(event) {
    this.setData({ 'form.goalTargetDate': event.detail.value }, () => {
      this.scheduleGoalPreview(true);
    });
  },

  handleBirthDateColumnChange(event) {
    const nextIndex = this.data.birthDateColumnIndex.slice();
    nextIndex[event.detail.column] = event.detail.value;
    this.setData({ birthDateColumnIndex: nextIndex });
    if (event.detail.column === 0 || event.detail.column === 1) {
      this.updateBirthDateDays(nextIndex[0], nextIndex[1]);
    }
  },

  handleBirthDateConfirm(event) {
    const years = this.data.birthDateColumns[0];
    const months = this.data.birthDateColumns[1];
    const days = this.data.birthDateColumns[2];
    const value = event.detail.value;
    const year = years[value[0]] || years[0];
    const month = months[value[1]] || months[0];
    const day = days[value[2]] || days[0];
    const dateText = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    this.setData({
      'form.birthDate': dateText,
      birthDateDisplay: year + '年' + month + '月' + day + '日',
      birthDateColumnIndex: value,
    }, () => {
      this.refreshDerivedState(() => {
        this.scheduleGoalPreview();
      });
    });
  },

  handleUseRecommendedBmr() {
    const bmr = calculateFormulaBmr(this.data.form);
    if (bmr == null) {
      wx.showToast({ title: '当前无法计算推荐 BMR', icon: 'none' });
      return;
    }
    this.setData({ 'form.bmr': String(bmr) }, () => {
      this.refreshDerivedState(() => {
        this.scheduleGoalPreview(true);
      });
    });
  },

  handlePrevStep() {
    if (this.data.submitting || this.data.currentStep <= 0) {
      return;
    }
    this.setCurrentStep(this.data.currentStep - 1);
  },

  handleNextStep() {
    if (this.data.submitting || !this.validateCurrentStep()) {
      return;
    }

    if (this.data.currentStep < this.data.steps.length - 1) {
      const nextStep = this.data.currentStep + 1;
      this.setCurrentStep(nextStep, () => {
        if (this.data.steps[nextStep].key === 'goalPlan') {
          this.scheduleGoalPreview(true);
        }
      });
      return;
    }

    this.handleComplete();
  },

  handleSkipOptionalStep() {
    const currentStep = this.data.steps[this.data.currentStep];
    if (this.data.submitting || !currentStep || !currentStep.optional) {
      return;
    }

    const payload = this.buildSkipPayload();
    if (!payload) {
      wx.showToast({ title: '请先完成前 3 步', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '稍后完善',
      content: '后续可在健康档案里补充。',
      cancelText: '继续填写',
      confirmText: '完成建档',
      success: (result) => {
        if (!result.confirm) {
          return;
        }
        this.submitOnboarding(payload);
      },
    });
  },

  validateCurrentStep() {
    const stepKey = this.data.steps[this.data.currentStep].key;
    const form = this.data.form;

    if (stepKey === 'basic') {
      if (!form.gender) {
        wx.showToast({ title: '请选择性别', icon: 'none' });
        return false;
      }
      if (!form.birthDate) {
        wx.showToast({ title: '请选择生日', icon: 'none' });
        return false;
      }
    }

    if (stepKey === 'body') {
      const height = toPositiveNumber(form.height);
      if (height == null || !Number.isFinite(height) || height < 50) {
        wx.showToast({ title: '请输入正确身高', icon: 'none' });
        return false;
      }
      const currentWeight = toPositiveNumber(form.currentWeight);
      if (currentWeight == null || !Number.isFinite(currentWeight) || currentWeight <= 0) {
        wx.showToast({ title: '请输入正确当前体重', icon: 'none' });
        return false;
      }
    }

    if (stepKey === 'bmr') {
      const bmr = toPositiveNumber(form.bmr);
      if (bmr == null || !Number.isFinite(bmr) || bmr <= 0) {
        wx.showToast({ title: '请输入正确 BMR', icon: 'none' });
        return false;
      }
    }

    if (stepKey === 'goalTarget') {
      const targetWeight = toPositiveNumber(form.targetWeight);
      if (targetWeight == null) {
        if (form.goalTargetDate) {
          wx.showToast({ title: '请先填写目标体重', icon: 'none' });
          return false;
        }
        return true;
      }
      if (!Number.isFinite(targetWeight) || targetWeight <= 0) {
        wx.showToast({ title: '请输入正确目标体重', icon: 'none' });
        return false;
      }
      if (shouldRequireGoalDate(form) && !isFutureGoalDate(form.goalTargetDate)) {
        wx.showToast({ title: '请设置至少 7 天后的日期', icon: 'none' });
        return false;
      }
    }

    if (stepKey === 'goalPlan') {
      if (getEffectiveGoalStrategy(form) === 'MANUAL') {
        const dailyCalorieTarget = toPositiveNumber(form.dailyCalorieTarget);
        if (dailyCalorieTarget == null || !Number.isFinite(dailyCalorieTarget) || dailyCalorieTarget <= 0) {
          wx.showToast({ title: '请输入目标热量', icon: 'none' });
          return false;
        }
      }
      if (!this.canPreviewGoalPlan()) {
        wx.showToast({ title: '请先完善目标计划', icon: 'none' });
        return false;
      }
    }

    return true;
  },

  buildCorePayload() {
    const form = this.data.form;
    const height = toPositiveNumber(form.height);
    const currentWeight = toPositiveNumber(form.currentWeight);
    const bmr = toPositiveNumber(form.bmr);
    if (!form.gender || !form.birthDate) {
      return null;
    }
    if (!Number.isFinite(height) || height < 50) {
      return null;
    }
    if (!Number.isFinite(currentWeight) || currentWeight <= 0) {
      return null;
    }
    if (!Number.isFinite(bmr) || bmr <= 0) {
      return null;
    }

    return {
      gender: form.gender,
      birthDate: form.birthDate,
      height,
      currentWeight,
      customBmr: toInteger(bmr),
    };
  },

  buildOptionalPayload() {
    const form = this.data.form;
    const payload = {};
    const targetWeight = toPositiveNumber(form.targetWeight);
    const effectiveStrategy = getEffectiveGoalStrategy(form);

    if (Number.isFinite(targetWeight) && targetWeight > 0) {
      payload.targetWeight = targetWeight;
      if (form.goalTargetDate) {
        payload.goalTargetDate = form.goalTargetDate;
      }
    }

    payload.goalCalorieStrategy = effectiveStrategy;
    if (effectiveStrategy === 'MANUAL') {
      const dailyCalorieTarget = toPositiveNumber(form.dailyCalorieTarget);
      if (Number.isFinite(dailyCalorieTarget) && dailyCalorieTarget > 0) {
        payload.dailyCalorieTarget = toInteger(dailyCalorieTarget);
      }
    }

    return payload;
  },

  buildFilledOptionalPayload() {
    const form = this.data.form;
    const payload = {};
    const targetWeight = toPositiveNumber(form.targetWeight);
    const effectiveStrategy = getEffectiveGoalStrategy(form);

    if (Number.isFinite(targetWeight) && targetWeight > 0) {
      payload.targetWeight = targetWeight;
      if (form.goalTargetDate && (!shouldRequireGoalDate(form) || isFutureGoalDate(form.goalTargetDate))) {
        payload.goalTargetDate = form.goalTargetDate;
      }
    }

    if (effectiveStrategy === 'MANUAL') {
      const dailyCalorieTarget = toPositiveNumber(form.dailyCalorieTarget);
      if (Number.isFinite(dailyCalorieTarget) && dailyCalorieTarget > 0) {
        payload.goalCalorieStrategy = 'MANUAL';
        payload.dailyCalorieTarget = toInteger(dailyCalorieTarget);
      }
    } else if (
      Number.isFinite(targetWeight) &&
      targetWeight > 0 &&
      (!shouldRequireGoalDate(form) || isFutureGoalDate(form.goalTargetDate))
    ) {
      payload.goalCalorieStrategy = 'SMART';
    }

    return payload;
  },

  buildSkipPayload() {
    const corePayload = this.buildCorePayload();
    if (!corePayload) {
      return null;
    }
    return Object.assign({}, corePayload, this.buildFilledOptionalPayload());
  },

  canPreviewGoalPlan() {
    return !!this.buildPreviewPayload();
  },

  buildPreviewPayload() {
    const corePayload = this.buildCorePayload();
    if (!corePayload) {
      return null;
    }

    const form = this.data.form;
    const effectiveStrategy = getEffectiveGoalStrategy(form);
    const payload = {
      gender: corePayload.gender,
      birthDate: corePayload.birthDate,
      height: corePayload.height,
      currentWeight: corePayload.currentWeight,
      customBmr: corePayload.customBmr,
      goalCalorieStrategy: effectiveStrategy,
    };

    if (effectiveStrategy === 'SMART') {
      const targetWeight = toPositiveNumber(form.targetWeight);
      if (!Number.isFinite(targetWeight) || targetWeight <= 0) {
        return null;
      }
      if (shouldRequireGoalDate(form) && !isFutureGoalDate(form.goalTargetDate)) {
        return null;
      }
      payload.targetWeight = targetWeight;
      if (form.goalTargetDate) {
        payload.goalTargetDate = form.goalTargetDate;
      }
      return payload;
    }

    const dailyCalorieTarget = toPositiveNumber(form.dailyCalorieTarget);
    if (dailyCalorieTarget == null || !Number.isFinite(dailyCalorieTarget) || dailyCalorieTarget <= 0) {
      return null;
    }
    payload.dailyCalorieTarget = toInteger(dailyCalorieTarget);
    return payload;
  },

  scheduleGoalPreview(immediate) {
    if (this.data.steps[this.data.currentStep].key !== 'goalPlan' && !immediate) {
      return;
    }
    if (this.goalPreviewTimer) {
      clearTimeout(this.goalPreviewTimer);
    }
    this.goalPreviewTimer = setTimeout(() => {
      this.refreshGoalPreview();
    }, immediate ? 0 : 220);
  },

  refreshGoalPreview(force) {
    const strategy = getEffectiveGoalStrategy(this.data.form);
    const payload = this.buildPreviewPayload();
    if (!payload) {
      this.setData({ goalPreview: createGoalPreviewState(strategy) });
      return Promise.resolve(null);
    }

    const signature = JSON.stringify(payload);
    if (
      !force &&
      signature === this.lastGoalPreviewSignature &&
      this.data.goalPreview.status === 'ready' &&
      this.data.goalPreview.raw
    ) {
      return Promise.resolve(this.data.goalPreview.raw);
    }

    this.lastGoalPreviewSignature = signature;
    const requestId = Date.now();
    this.goalPreviewRequestId = requestId;
    this.setData({
      goalPreview: Object.assign(createGoalPreviewState(strategy), {
        status: 'loading',
      }),
    });

    return previewGoalPlan(payload)
      .then((preview) => {
        if (this.goalPreviewRequestId !== requestId) {
          return preview;
        }
        this.setData({ goalPreview: buildGoalPreviewState(preview, strategy) });
        return preview;
      })
      .catch((error) => {
        if (this.goalPreviewRequestId !== requestId) {
          return null;
        }
        this.setData({
          goalPreview: Object.assign(createGoalPreviewState(strategy), {
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

  buildPayload() {
    const corePayload = this.buildCorePayload();
    if (!corePayload) {
      return null;
    }
    return Object.assign({}, corePayload, this.buildOptionalPayload());
  },

  confirmExtremePreview(preview) {
    if (!preview || preview.warningLevel !== 'EXTREME') {
      return Promise.resolve(true);
    }
    const fallbackContent = getEffectiveGoalStrategy(this.data.form) === 'MANUAL'
      ? '按当前目标热量执行会偏激进，建议先调高或重新确认目标热量。'
      : '按当前设置达到目标会比较激进，建议延后日期或调整目标体重。';
    return new Promise((resolve) => {
      wx.showModal({
        title: '目标可能过激',
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

  submitOnboarding(payload) {
    if (!payload || this.data.submitting) {
      return;
    }
    this.setData({ submitting: true });
    updateProfile(Object.assign({}, payload, {
      seedInitialWeightRecord: true,
    }), { loadingMode: 'none' })
      .then(() => {
        wx.showToast({ title: '已保存', icon: 'success' });
        setTimeout(() => {
          this.finishOnboarding();
        }, 260);
      })
      .catch((error) => {
        wx.showToast({ title: pickErrorMessage(error), icon: 'none' });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  },

  handleComplete() {
    if (this.data.submitting || !this.validateCurrentStep()) {
      return;
    }
    this.refreshGoalPreview(true)
      .then((preview) => this.confirmExtremePreview(preview).then((confirmed) => ({ confirmed })))
      .then((result) => {
        if (!result.confirmed) {
          return;
        }
        this.submitOnboarding(this.buildPayload());
      });
  },

  finishOnboarding() {
    const app = getApp();
    const userId = getCurrentUserId();
    if (app && typeof app.completeOnboarding === 'function') {
      app.completeOnboarding(userId);
    }
    wx.switchTab({ url: '/pages/home/index' });
  },
});
