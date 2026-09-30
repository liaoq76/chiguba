// pages/data/feedback.js — 意见反馈（PRD 4.8.7 / 决策139-140）
Page({
  data: {
    content: '',
    contact: ''
  },

  onContent(e) { this.setData({ content: e.detail.value }); },
  onContact(e) { this.setData({ contact: e.detail.value }); },

  submit() {
    if (!this.data.content.trim()) {
      return wx.showToast({ title: '请填写反馈内容', icon: 'none' });
    }
    wx.showLoading({ title: '提交中...' });
    wx.cloud.callFunction({
      name: 'feedback',
      data: { content: this.content, contact: this.contact },
      success: () => {
        wx.hideLoading();
        wx.showToast({ title: '反馈已提交，感谢你的建议', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      },
      fail: e => {
        wx.hideLoading();
        wx.showToast({ title: '提交失败', icon: 'none' });
      }
    });
  }
});
