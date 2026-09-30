// app.js
const Sync = require('./utils/sync.js');
const Storage = require('./utils/storage.js');
const Vocab = require('./utils/vocab.js');

App({
  globalData: {
    openid: '',
    envId: 'cloudbase-d4gsz9sx6c8d47a29',
    pendingSyncCount: 0,
    online: true,
    bootedAt: Date.now()
  },

  onLaunch() {
    // === 初始化云开发 ===
    console.log('[db] wx.cloud:', !!wx.cloud);
    if (wx.cloud) {
      wx.cloud.init({
        env: this.globalData.envId,
        traceUser: true
      });
      console.log('[db] cloud.init ok, envId:', this.globalData.envId);
    } else {
      console.warn('[db] wx.cloud is undefined — 可能是模拟器环境不支持云开发，请在真机上测试');
    }

    // === 首次启动自动初始化数据库（幂等，可重复执行）===
    if (wx.cloud && !wx.getStorageSync('dbInited')) {
      wx.cloud.callFunction({
        name: 'initDBSchema',
        data: {},
        success: res => {
          wx.setStorageSync('dbInited', true);
          console.log('[db] initDBSchema ok:', res.result);
        },
        fail: err => {
          console.warn('[db] initDBSchema failed:', err);
          // 失败不阻塞，下次启动再试
        }
      });
    }

    // 监听网络变化
    wx.onNetworkStatusChange(res => {
      const wasOnline = this.globalData.online;
      this.globalData.online = res.isConnected;
      if (!wasOnline && res.isConnected) {
        Sync.flushQueue();
      }
      this.emitNetworkChange(res.isConnected);
    });

    wx.getNetworkType({
      success: res => { this.globalData.online = res.networkType !== 'none'; }
    });

    Sync.startScheduler();

    Vocab.ensureDefaults();
  },

  emitNetworkChange(online) {
    const pages = getCurrentPages();
    pages.forEach(p => {
      if (p.onNetworkChange) p.onNetworkChange(online);
    });
  },

  emitSyncUpdate() {
    if (this._emitSyncTimer) return;
    this._emitSyncTimer = setTimeout(() => {
      this._emitSyncTimer = null;
      const pages = getCurrentPages();
      pages.forEach(p => {
        if (p.onSyncUpdate) p.onSyncUpdate(this.globalData.pendingSyncCount);
      });
    }, 120);
  }
});
