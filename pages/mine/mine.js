// pages/mine/mine.js — 我的（PRD 4.8.1）
const app = getApp();
const Storage = require('../../utils/storage.js');
const Profile = require('../../utils/profile.js');

Page({
  data: {
    nickname: '吃谷人',
    avatarURL: '',
    pendingSync: 0,
    online: true,

    // 昵称编辑弹层
    nickVisible: false,
    nickInput: '',
    nickFocus: false,
    nickPass: true,
    nickReviewed: false
  },

  onShow() {
    const profile = Storage.getProfile();
    this.setData({
      nickname: profile.nickname || '吃谷人',
      avatarURL: Profile.getAvatarURL(),
      pendingSync: app.globalData.pendingSyncCount || 0,
      online: app.globalData.online
    });
  },

  onNetworkChange(online) { this.setData({ online }); },
  onSyncUpdate(count) { this.setData({ pendingSync: count }); },

  goBudget() { wx.navigateTo({ url: '/pages/budget/budget' }); },
  goPresale() { wx.navigateTo({ url: '/pages/presale/presale' }); },
  goVocab() { wx.navigateTo({ url: '/pages/vocab/vocab' }); },
  goData() { wx.navigateTo({ url: '/pages/data/data' }); },
  goAbout() { wx.navigateTo({ url: '/pages/data/about' }); },
  goStats() { wx.navigateTo({ url: '/pages/stats/stats' }); },

  // ========== 头像（点击 → 直接触发微信原生面板）==========
  onWxChooseAvatar(e) {
    const url = e.detail && e.detail.avatarUrl;
    if (!url) return;
    this._commitAvatar(url);
  },

  // ========== 昵称弹层 ==========
  onNickTap() {
    this.setData({
      nickVisible: true,
      nickInput: this.data.nickname,
      nickFocus: false,
      nickPass: true,
      nickReviewed: false
    });
    // 延迟一下再聚焦，让弹层动画先跑完，否则 input 可能在键盘弹出动画中途
    setTimeout(() => this.setData({ nickFocus: true }), 350);
  },

  onNickCancel() {
    this.setData({ nickVisible: false, nickFocus: false });
  },

  onNickSubmit(e) {
    const val = e.detail.value && e.detail.value.nickname;
    const nick = val ? String(val).trim() : '';
    if (!nick) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    if (!this.data.nickPass) {
      wx.showToast({ title: '昵称包含敏感内容', icon: 'none' });
      return;
    }
    Profile.setNickname(nick);
    this.setData({
      nickVisible: false,
      nickFocus: false,
      nickname: nick
    });
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  // 敏感词检测（基础库 2.29.1+）
  onNickReview(e) {
    this.setData({
      nickPass: e.detail && e.detail.pass !== false,
      nickReviewed: true
    });
  },

  // ========== 提交头像（由微信 chooseAvatar 触发）==========
  async _commitAvatar(localPath) {
    Profile.setAvatarLocal(localPath);
    this.setData({ avatarURL: Profile.getAvatarURL() });
    wx.showLoading({ title: '上传中', mask: true });
    await Profile.uploadAvatar();
    wx.hideLoading();
    this.setData({ avatarURL: Profile.getAvatarURL() });
    wx.showToast({ title: '头像已更新', icon: 'success' });
  }
});
