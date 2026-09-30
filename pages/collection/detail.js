// pages/collection/detail.js — 收藏详情（PRD 4.3.11）
const Storage = require('../../utils/storage.js');
const Collection = require('../../utils/collection.js');
const Format = require('../../utils/format.js');

Page({
  data: {
    id: '',
    item: null,
    relatedExpenses: [],
    editingQty: false,
    newQty: 0
  },

  onLoad(options) {
    this.setData({ id: options.id });
    this.refresh();
  },

  onShow() { this.refresh(); },

  refresh() {
    const c = Storage.getCollections().find(x => x._id === this.data.id);
    if (!c) { wx.navigateBack(); return; }

    const expenseIds = Storage.getContributions()
      .filter(cc => cc.collectionId === this.data.id)
      .map(cc => cc.expenseId);

    const all = Storage.getExpenses();
    const related = all.filter(e => expenseIds.includes(e._id))
      .sort((a, b) => (b.date || b.createdAt || 0) - (a.date || a.createdAt || 0))
      .map(e => ({
        _id: e._id,
        name: e.productName || e.gameName || '未命名',
        amount: Format.formatAmount(e.totalAmount),
        dateLabel: Format.formatDate(new Date(e.date || e.createdAt)),
        qty: (Storage.getContributions().find(cc => cc.expenseId === e._id) || {}).qty || 0
      }));

    this.setData({
      item: {
        ...c,
        startDateLabel: Format.formatDate(new Date(c.startDate))
      },
      relatedExpenses: related,
      newQty: c.currentQty
    });
  },

  // 数量 + / - / 直接编辑（PRD 4.3.4）
  adjustQty(e) {
    const op = Number(e.currentTarget.dataset.op);
    Collection.adjustQty(this.data.id, op, 'add');
    this.refresh();
  },

  startEditQty() {
    this.setData({ editingQty: true, newQty: this.data.item.currentQty });
  },

  onNewQty(e) {
    this.setData({ newQty: Number(e.detail.value) || 0 });
  },

  confirmQty() {
    Collection.adjustQty(this.data.id, this.data.newQty, 'set');
    this.setData({ editingQty: false });
    this.refresh();
  },

  cancelQty() {
    this.setData({ editingQty: false });
  }
});
