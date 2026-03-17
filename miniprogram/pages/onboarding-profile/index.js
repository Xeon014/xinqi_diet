const { updateProfile, previewGoalPlan } = require('../../services/user');
const { getCurrentUserId } = require('../../utils/auth');
const { addDays, getToday } = require('../../utils/date');
const { pickErrorMessage } = require('../../utils/request');

const STEPS = [
  { key: 'gender', title: '选择性别', description: '用于基础代谢和健康指标计算。' },
  { key: 'birthDate', title: '填写生日', description: '用于年龄和基础代谢估算。' },
  { key: 'height', title: '填写身高', description: '单位 cm。' },
  { key: 'currentWeight', title: '填写当前体重', description: '单位 kg。' },
  { key: 'targetWeight', title: '设置目标体重', description: '用于计算目标热量。' },
  { key: 'goalTargetDate', title: '设置预期日期', description: '非维持体重时，至少晚于今天 7 天。' },
  { key: 'bmr', title: '确认基础代谢 BMR', description: '可直接使用系统估算值。' },
  { key: 'goalPlan', title: '确认目标计划', description: '默认按目标体重和日期智能推荐，也支持手动设置。' },
];

const GENDER_OPTIONS = [
  { label: '女', value: 'FEMALE' },
  { label: '男', value: 'MALE' },
];

const GOAL_STRATEGIES = [
  { label: '智能推荐', value: 'SMART' },
  { label: '手动设置', value: 'MANUAL' },
];

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

function calculateBaseCalories(bmr) {
  if (bmr == null) {
    return null;
  }
  return toInteger(bmr / 0.7);
}

function createGoalPreviewState() {
  return {
    status: 'idle',
    raw: null,
    title: '智能推荐目标',
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
    title: strategy === 'MANUAL' ? '当前手动目标' : '智能推荐目标',
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

function shouldRequireGoalDate(form) {
  const currentWeight = toPositiveNumber(form.currentWeight);
  const targetWeight = toPositiveNumber(form.targetWeight);
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
    maxBirthDate: getToday(),
    minGoalDate: addDays(getToday(), 7),
    steps: STEPS,
    currentStep: 0,
    genderOptions: GENDER_OPTIONS,
    goalStrategies: GOAL_STRATEGIES,
    submitting: false,
    formulaBmrPreview: '--',
    baseCaloriesHint: '暂时无法预估基础日消耗，请先完善基础信息。',
    birthDateColumns: [[], [], []],
    birthDateColumnIndex: [0, 0, 0],
    birthDateDisplay: '',
    goalPreview: createGoalPreviewState(),
    form: {
      birthDate: '',
      height: '',
      currentWeight: '',
      targetWeight: '',
      goalTargetDate: '',
      bmr: '',
      dailyCalorieTarget: '',
      goalCalorieStrategy: 'SMART',
    },
  },

  onLoad() {
    this.initBirthDateColumns();
    this.refreshFormulaMeta();
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

  refreshFormulaMeta() {
    const formulaBmr = calculateFormulaBmr(this.data.form);
    const customBmr = toPositiveNumber(this.data.form.bmr);
    const effectiveBmr = customBmr != null && Number.isFinite(customBmr) && customBmr > 0 ? customBmr : formulaBmr;
    const baseCalories = calculateBaseCalories(effectiveBmr);
    this.setData({
      formulaBmrPreview: formulaBmr == null ? '--' : String(formulaBmr),
      baseCaloriesHint: baseCalories == null
        ? '暂时无法预估基础日消耗，请先完善基础信息。'
        : '预估基础日消耗约 ' + baseCalories + ' kcal/天',
    });
  },

  handleInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ ['form.' + field]: event.detail.value }, () => {
      this.refreshFormulaMeta();
      this.scheduleGoalPreview();
    });
  },

  handleGenderSelect(event) {
    const value = event.currentTarget.dataset.value;
    this.setData({ 'form.gender': value }, () => {
      this.refreshFormulaMeta();
      this.scheduleGoalPreview();
    });
  },

  handleGoalStrategySelect(event) {
    const value = event.currentTarget.dataset.value;
    this.setData({ 'form.goalCalorieStrategy': value }, () => {
      this.scheduleGoalPreview(true);
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
      this.refreshFormulaMeta();
      this.scheduleGoalPreview();
    });
  },

  handleUseRecommendedBmr() {
    const bmr = calculateFormulaBmr(this.data.form);
    if (bmr == null) {
      wx.showToast({ title: '当前无法计算推荐 BMR', icon: 'none' });
      return;
    }
    this.setData({ 'form.bmr': String(bmr) }, () => {
      this.refreshFormulaMeta();
      this.scheduleGoalPreview(true);
    });
  },

  handlePrevStep() {
    if (this.data.submitting || this.data.currentStep <= 0) {
      return;
    }
    this.setData({ currentStep: this.data.currentStep - 1 });
  },

  handleNextStep() {
    if (this.data.submitting || !this.validateCurrentStep()) {
      return;
    }
    if (this.data.currentStep < this.data.steps.length - 1) {
      const nextStep = this.data.currentStep + 1;
      this.setData({ currentStep: nextStep }, () => {
        if (this.data.steps[nextStep].key === 'goalPlan') {
          this.scheduleGoalPreview(true);
        }
      });
      return;
    }
    this.handleComplete();
  },

  validateCurrentStep() {
    const stepKey = this.data.steps[this.data.currentStep].key;
    const form = this.data.form;
    if (stepKey === 'gender' && !form.gender) {
      wx.showToast({ title: '请选择性别', icon: 'none' });
      return false;
    }
    if (stepKey === 'birthDate' && !form.birthDate) {
      wx.showToast({ title: '请选择生日', icon: 'none' });
      return false;
    }
    if (stepKey === 'height') {
      const height = toPositiveNumber(form.height);
      if (height == null || !Number.isFinite(height) || height < 50) {
        wx.showToast({ title: '请输入正确身高', icon: 'none' });
        return false;
      }
    }
    if (stepKey === 'currentWeight') {
      const currentWeight = toPositiveNumber(form.currentWeight);
      if (currentWeight == null || !Number.isFinite(currentWeight) || currentWeight <= 0) {
        wx.showToast({ title: '请输入正确当前体重', icon: 'none' });
        return false;
      }
    }
    if (stepKey === 'targetWeight') {
      const targetWeight = toPositiveNumber(form.targetWeight);
      if (targetWeight == null || !Number.isFinite(targetWeight) || targetWeight <= 0) {
        wx.showToast({ title: '请输入正确目标体重', icon: 'none' });
        return false;
      }
    }
    if (stepKey === 'goalTargetDate') {
      if (shouldRequireGoalDate(form) && !isFutureGoalDate(form.goalTargetDate)) {
        wx.showToast({ title: '请设置至少 7 天后的日期', icon: 'none' });
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
    if (stepKey === 'goalPlan') {
      if (form.goalCalorieStrategy === 'MANUAL') {
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

  canPreviewGoalPlan() {
    return !!this.buildPreviewPayload();
  },

  buildPreviewPayload() {
    const form = this.data.form;
    const height = toPositiveNumber(form.height);
    const currentWeight = toPositiveNumber(form.currentWeight);
    const targetWeight = toPositiveNumber(form.targetWeight);
    const bmr = toPositiveNumber(form.bmr);
    if (!form.gender || !form.birthDate || !Number.isFinite(height) || height < 50 || !Number.isFinite(currentWeight) || currentWeight <= 0 || !Number.isFinite(targetWeight) || targetWeight <= 0) {
      return null;
    }
    if (shouldRequireGoalDate(form) && !isFutureGoalDate(form.goalTargetDate)) {
      return null;
    }
    const payload = {
      gender: form.gender,
      birthDate: form.birthDate,
      height,
      currentWeight,
      targetWeight,
      goalCalorieStrategy: form.goalCalorieStrategy,
    };
    if (form.goalTargetDate) {
      payload.goalTargetDate = form.goalTargetDate;
    }
    if (Number.isFinite(bmr) && bmr > 0) {
      payload.customBmr = toInteger(bmr);
    }
    if (form.goalCalorieStrategy === 'MANUAL') {
      const dailyCalorieTarget = toPositiveNumber(form.dailyCalorieTarget);
      if (dailyCalorieTarget == null || !Number.isFinite(dailyCalorieTarget) || dailyCalorieTarget <= 0) {
        return null;
      }
      payload.dailyCalorieTarget = toInteger(dailyCalorieTarget);
    }
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
      goalPreview: Object.assign(createGoalPreviewState(), {
        status: 'loading',
        title: payload.goalCalorieStrategy === 'MANUAL' ? '当前手动目标' : '智能推荐目标',
      }),
    });
    return previewGoalPlan(payload)
      .then((preview) => {
        if (this.goalPreviewRequestId !== requestId) {
          return preview;
        }
        this.setData({ goalPreview: buildGoalPreviewState(preview, payload.goalCalorieStrategy) });
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

  buildPayload() {
    return this.buildPreviewPayload() || {};
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
        const payload = this.buildPayload();
        this.setData({ submitting: true });
        updateProfile(payload)
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