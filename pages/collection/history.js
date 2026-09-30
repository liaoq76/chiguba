// pages/collection/history.js — 收藏历史
const Storage = require('../../utils/storage.js');
const Format = require('../../utils/format.js');

Page({
  data: { items: [] },

  onShow() {
    const items = Storage.getCollections()
      .filter(c => c.currentQty === 0 || c.status === 'history')
      .map(c => ({
        ...c,
        startDateLabel: Format.formatDate(new Date(c.startDate))
      }));
    this.setData({ items });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/collection/detail?id=' + id });
  }
});
