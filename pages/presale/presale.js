// pages/presale/presale.js — 预售管理（PRD 4.4）
const Storage = require('../../utils/storage.js');
const Format = require('../../utils/format.js');
const C = require('../../utils/constants.js');

Page({
  data: {
    tab: 'pending',          // pending / received
    pendingList: [],
    receivedList: []
  },

  onShow() { this.refresh(); },
  onPullDownRefresh() { this.refresh(); wx.stopPullDownRefresh(); },

  refresh() {
    const list = Storage.getPresales();
    const fmt = p => ({
      _id: p._id,
      name: p.name,
      amount: Format.formatAmount(p.amount),
      expectedShip: p.expectedShip ? Format.formatMonth(new Date(p.expectedShip)) : '未设',
      quantity: p.quantity
    });
    this.setData({
      pendingList: list.filter(p => p.status === C.PRESALE_STATUS.PENDING).map(fmt),
      receivedList: list.filter(p => p.status === C.PRESALE_STATUS.RECEIVED).map(fmt)
    });
  },

  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.t }); },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/presale/detail?id=' + e.currentTarget.dataset.id });
  }
});
