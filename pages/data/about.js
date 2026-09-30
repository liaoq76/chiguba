// pages/data/about.js — 关于吃谷吗（PRD 4.8.7）
Page({
  copyContact() {
    wx.setClipboardData({
      data: 'feedback@chigu.example.com',
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    });
  }
});
