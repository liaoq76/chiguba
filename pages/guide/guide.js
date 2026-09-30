// pages/guide/guide.js — 新手引导（PRD 7.1 / 决策225-226）
Page({
  data: {
    step: 1,                 // 1 / 2 / 3
    steps: [
      {
        seal: '◉',
        title: '记录消费',
        desc: '支持谷子周边与游戏氪金，10~20 秒完成一次基础记录。'
      },
      {
        seal: '♡',
        title: '管理收藏',
        desc: '当前拥有与历史拥有独立管理，数量自动同步。'
      },
      {
        seal: '⌒',
        title: '查看分析',
        desc: '统计页提供时间趋势、消费构成、IP Top5 等多维分析。'
      }
    ]
  },

  next() {
    if (this.data.step < 3) {
      this.setData({ step: this.data.step + 1 });
    } else {
      this.finish();
    }
  },

  prev() {
    if (this.data.step > 1) {
      this.setData({ step: this.data.step - 1 });
    }
  },

  finish() {
    wx.setStorageSync('guideShown', true);
    wx.navigateBack();
  }
});
