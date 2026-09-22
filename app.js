// app.js
const Storage = require('./utils/storage.js');

App({
  onLaunch() {
    // 初始化本地存储的默认分类与字段
    Storage.initDefaults();

    // 云开发初始化 + 自动拉取
    if (typeof wx.cloud !== 'undefined') {
      wx.cloud.init({
        env: 'cloudbase-d4gsz9sx6c8d47a29',   // ← 云环境 ID，首次在微信开发者工具控制台创建后填这里
        traceUser: true
      });
      // 首次打开 / 每次冷启动时从云端拉取最新数据
      const syncState = Storage.getSyncState();
      Storage.pullFromCloud().then(merged => {
        if (merged !== null) {
          console.log('[cloud] pulled', merged.length, 'records from cloud');
        }
      }).catch(err => {
        console.warn('[cloud] pull failed, using local cache', err);
      });
    }

    // 读取主题偏好
    const theme = Storage.getTheme();
    this.globalData.theme = theme;
  },

  globalData: {
    userInfo: null,
    theme: 'pink',
    categories: []
  }
});