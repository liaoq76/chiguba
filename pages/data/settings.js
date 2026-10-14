// pages/data/settings.js — 通用设置（紫色 Hero V2）
Page({
  data: {
    // 通知设置
    notifyBudget: true,
    notifySync: true,
    notifySale: false,
    notifyPush: true,

    // 隐私设置
    biometricLock: false,
    hideAmount: false,

    // 主题切换（仅 UI 切换，不实现真实功能）
    themeMode: 'system', // system | light | dark | pink | purple

    // 通用
    autoBackup: true,
    smartRecognition: true
  },

  onLoad() {},

  toggleSwitch(e) {
    const { key } = e.currentTarget.dataset;
    const val = e.detail.value;
    this.setData({ [key]: val });
  },

  selectTheme(e) {
    const { theme } = e.currentTarget.dataset;
    this.setData({ themeMode: theme });
    const nameMap = { system: '跟随系统', light: '浅色', dark: '深色', pink: '樱花粉', purple: '薰衣草紫' };
    wx.showToast({ title: '已切换：' + nameMap[theme], icon: 'none' });
  },

  goPrivacy() {
    wx.navigateTo({ url: '/pages/data/privacy' });
  },

  goAgreement() {
    wx.navigateTo({ url: '/pages/data/agreement' });
  },

  goAbout() {
    wx.navigateTo({ url: '/pages/data/about' });
  },

  goFeedback() {
    wx.navigateTo({ url: '/pages/data/feedback' });
  },

  checkUpdate() {
    wx.showLoading({ title: '检查中…' });
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: '已是最新版本', icon: 'success' });
    }, 800);
  },

  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '将清除小程序本地缓存（不会清空你的业务数据）。',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已清除', icon: 'success' });
        }
      }
    });
  }
});
