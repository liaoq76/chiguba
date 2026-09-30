// pages/presale/detail.js — 预售详情（PRD 4.4.11 / 4.4.12）
const Storage = require('../../utils/storage.js');
const Presale = require('../../utils/presale.js');
const Format = require('../../utils/format.js');

Page({
  data: {
    id: '',
    item: null,
    relatedExpense: null
  },

  onLoad(options) {
    this.setData({ id: options.id });
    this.refresh();
  },

  onShow() { this.refresh(); },

  refresh() {
    const p = Storage.getPresales().find(x => x._id === this.data.id);
    if (!p) { wx.navigateBack(); return; }
    const exp = p.expenseId ? Storage.getExpenses().find(e => e._id === p.expenseId) : null;

    this.setData({
      item: {
        ...p,
        amountLabel: Format.formatAmount(p.amount),
        expectedShipLabel: p.expectedShip ? Format.formatDate(new Date(p.expectedShip)) : '未设',
        statusLabel: p.status === 'received' ? '已收到' : '待收到'
      },
      relatedExpense: exp ? {
        _id: exp._id,
        name: exp.productName || exp.gameName || '未命名',
        amount: Format.formatAmount(exp.totalAmount)
      } : null
    });
  },

  markReceived() {
    Presale.markReceived(this.data.id);
    wx.showToast({ title: '已标记为已收到', icon: 'success' });
    this.refresh();
  },

  deleteOne() {
    wx.showModal({
      title: '删除该预售？',
      content: '此操作不影响关联的消费和收藏。',
      confirmText: '删除',
      confirmColor: '#8b2a24',
      success: r => {
        if (r.confirm) {
          Presale.remove(this.data.id);
          wx.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 600);
        }
      }
    });
  }
});
