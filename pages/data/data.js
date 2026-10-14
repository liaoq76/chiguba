// pages/data/data.js — 数据导出（粉色 Hero V2）
Page({
  data: {
    // 同步状态
    queueCount: 28,
    pendingSync: 5,
    failedCount: 1,
    online: true,

    // 上次导出
    lastExportAt: '2026-10-08 14:23',

    // 备份状态
    backupEnabled: true,
    lastBackupAt: '今天 09:12'
  },

  onLoad() {},

  doExport() {
    wx.showLoading({ title: '生成中…' });
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: '已导出 XLSX', icon: 'success' });
    }, 800);
  },

  retrySync() {
    wx.showLoading({ title: '重试中…' });
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: '已重试', icon: 'success' });
    }, 600);
  },

  cleanQueue() {
    wx.showModal({
      title: '清理队列',
      content: '确定清理已同步/失败的本地残留吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ pendingSync: 0, failedCount: 0 });
          wx.showToast({ title: '已清理', icon: 'success' });
        }
      }
    });
  },

  toggleBackup(e) {
    this.setData({ backupEnabled: e.detail.value });
    wx.showToast({ title: e.detail.value ? '已开启云端备份' : '已关闭云端备份', icon: 'none' });
  },

  doClear() {
    wx.showModal({
      title: '⚠️ 清空数据',
      content: '将清空所有消费/收藏/预算等业务数据，个人词库会保留。此操作不可恢复！',
      confirmText: '确认清空',
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  }
});
