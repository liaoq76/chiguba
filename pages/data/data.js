// pages/data/data.js — 数据管理（PRD 4.8）
const Export = require('../../utils/export.js');
const Storage = require('../../utils/storage.js');
const Sync = require('../../utils/sync.js');

Page({
  data: {
    pendingSync: 0,
    queueCount: 0,
    failedCount: 0
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const q = Storage.getSyncQueue();
    this.setData({
      queueCount: q.length,
      pendingSync: q.filter(x => x.status !== 'done').length,
      failedCount: q.filter(x => x.status === 'failed').length
    });
  },

  async doExport() {
    wx.showLoading({ title: '生成文件中...' });
    try {
      await Export.exportToXlsx();
      wx.hideLoading();
    } catch (e) {
      wx.hideLoading();
      wx.showModal({ title: '导出失败', content: e.message || '请稍后重试', showCancel: false });
    }
  },

  doClear() {
    wx.showModal({
      title: '清空全部数据？',
      content: '将清空所有消费、收藏、预售、预算记录。个人词库将保留。\n此操作不可撤销。',
      confirmText: '清空',
      confirmColor: '#8b2a24',
      success: r => {
        if (r.confirm) {
          Storage.clearBusinessData();
          // 同步云端
          if (wx.cloud) {
            wx.cloud.callFunction({ name: 'clearAll', success: () => {} });
          }
          this.refresh();
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  },

  retrySync() {
    Sync.retryFailed();
    this.refresh();
    wx.showToast({ title: '已触发重试', icon: 'success' });
  },

  cleanQueue() {
    wx.showModal({
      title: '清理本地同步队列？',
      content: '将移除已完成和失败的同步项。如果云端已有这些数据，本地的待同步提示会消失。\n如果云端没数据，重新打开小程序时新产生的修改也不会再上传了（除非您再添加新记录）。',
      confirmText: '清理',
      success: r => {
        if (r.confirm) {
          const dropped = Sync.cleanDoneAndFailed();
          this.refresh();
          wx.showToast({ title: dropped > 0 ? `已清理 ${dropped} 条` : '无可清理', icon: 'success' });
        }
      }
    });
  }
});
