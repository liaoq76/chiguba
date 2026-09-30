// pages/expense/detail.js — 消费详情（PRD 4.2.14 / 4.2.16）
const Storage = require('../../utils/storage.js');
const Expense = require('../../utils/expense.js');
const Format = require('../../utils/format.js');
const Image = require('../../utils/image.js');

Page({
  data: {
    id: '',
    expense: null,
    presale: null,
    contributions: []
  },

  onLoad(options) {
    this.setData({ id: options.id });
    this.refresh();
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const e = Storage.getExpenses().find(x => x._id === this.data.id);
    if (!e) { wx.navigateBack(); return; }

    const presale = Storage.getPresales().find(p => p.expenseId === this.data.id);
    const contribs = Storage.getContributions().filter(c => c.expenseId === this.data.id);
    const imageUrls = (e.images || []).map(img => Image.resolveDisplay(img));

    this.setData({
      expense: {
        ...e,
        amountLabel: Format.formatAmount(e.totalAmount),
        dateLabel: Format.formatDate(new Date(e.date || e.createdAt)),
        expectedShipLabel: e.expectedShip ? Format.formatDate(new Date(e.expectedShip)) : '',
        typeLabel: e.type === 'guzi' ? '谷子 / 周边' : '游戏氪金',
        sourceLabel: e.source === 'official' ? '官方' : (e.source === 'fanmade' ? '同人' : '未填'),
        imageUrls
      },
      presale: presale ? {
        ...presale,
        amountLabel: Format.formatAmount(presale.amount),
        expectedShipLabel: Format.formatDate(new Date(presale.expectedShip)),
        statusLabel: presale.status === 'received' ? '已收到' : '待收到'
      } : null,
      contributions: contribs
    });
  },

  onTapImage(e) {
    const idx = e.currentTarget.dataset.idx;
    const urls = this.data.expense.imageUrls || [];
    if (!urls.length) return;
    wx.previewImage({
      urls,
      current: urls[idx] || urls[0]
    });
  },

  goEdit() {
    const app = getApp();
    app.globalData.pendingEditExpenseId = this.data.id;
    wx.switchTab({ url: '/pages/add/add' });
  },

  deleteOne() {
    const e = this.data.expense;
    const hasPresale = !!this.data.presale;
    const hasContrib = this.data.contributions.length > 0;

    if (!hasPresale && !hasContrib) {
      // 简单二次确认（PRD 4.2.16 / 决策30）
      wx.showModal({
        title: '删除该消费？',
        content: '此操作不可撤销。',
        confirmText: '删除',
        confirmColor: '#8b2a24',
        success: r => {
          if (r.confirm) {
            Expense.remove(e._id, { removeCollection: false, removePresale: false });
            wx.showToast({ title: '已删除', icon: 'success' });
            setTimeout(() => wx.navigateBack(), 600);
          }
        }
      });
      return;
    }

    // 复杂：询问是否同步处理关联
    let msg = '该消费存在：\n';
    if (hasContrib) msg += '· 收藏关联\n';
    if (hasPresale) msg += '· 预售关联\n';
    msg += '\n是否同时处理关联数据？\n选"是"将删除关联，选"否"仅删除消费记录。';

    wx.showModal({
      title: '删除该消费？',
      content: msg,
      confirmText: '是（同时处理）',
      cancelText: '否（仅删除）',
      confirmColor: '#8b2a24',
      success: r => {
        if (r.confirm || r.cancel) {
          Expense.remove(e._id, {
            removeCollection: r.confirm,
            removePresale: r.confirm
          });
          wx.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 600);
        }
      }
    });
  }
});
