// custom-tab-bar/index.js
Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '首页', icon: 'home' },
      { pagePath: '/pages/expense/expense', text: '消费', icon: 'expense' },
      { pagePath: '/pages/add/add', text: '', icon: 'add' },
      { pagePath: '/pages/collection/collection', text: '收藏', icon: 'collection' },
      { pagePath: '/pages/mine/mine', text: '我的', icon: 'mine' }
    ]
  },
  methods: {
    onTap(e) {
      const idx = e.currentTarget.dataset.index;
      const item = this.data.list[idx];
      if (!item) return;
      if (item.icon === 'add') {
        // 中间 + 按钮：switchTab 即可
        wx.switchTab({ url: item.pagePath });
        return;
      }
      wx.switchTab({ url: item.pagePath });
    }
  }
});
