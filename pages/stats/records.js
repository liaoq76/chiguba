// pages/stats/records.js — 下钻消费记录（PRD 4.5.14）
const Storage = require('../../utils/storage.js');
const Format = require('../../utils/format.js');

Page({
  data: {
    title: '消费记录',
    conditions: [],         // 条件标签
    records: []
  },

  onLoad(options) {
    const conds = (options.conditions || '').split('|').filter(c => c);
    let records = Storage.getExpenses().filter(e => (e.totalAmount || 0) > 0);

    // 简单条件应用
    conds.forEach(cond => {
      const [k, v] = cond.split('=');
      if (k === 'ip') records = records.filter(e => (e.type === 'guzi' ? e.ip : e.gameName) === v);
      else if (k === 'type') records = records.filter(e => e.type === v);
      else if (k === 'reason') records = records.filter(e => e.gameReason === v);
      else if (k === 'productType') records = records.filter(e => e.productType === v);
      else if (k === 'channel') records = records.filter(e => e.channel === v);
      else if (k === 'date') records = records.filter(e => Format.formatDate(new Date(e.date || e.createdAt)) === v);
    });

    this.setData({
      title: options.title || '消费记录',
      conditions: conds.map(c => {
        const [k, v] = c.split('=');
        return { key: k, value: v, label: v };
      }),
      records: records.map(r => ({
        _id: r._id,
        name: r.productName || r.gameName || '未命名',
        sub: r.type === 'guzi' ? (r.ip || '未填IP') : (r.gameReason || ''),
        amount: Format.formatAmount(r.totalAmount),
        icon: r.type === 'guzi' ? '◉' : '◆',
        dateLabel: Format.formatDate(new Date(r.date || r.createdAt))
      }))
    });
  },

  removeCondition(e) {
    const idx = e.currentTarget.dataset.idx;
    const conditions = this.data.conditions.filter((_, i) => i !== idx);
    // 重新过滤
    let records = Storage.getExpenses().filter(e => (e.totalAmount || 0) > 0);
    conditions.forEach(cond => {
      const [k, v] = cond.key + '=' + cond.value;
      if (k === 'ip') records = records.filter(e => (e.type === 'guzi' ? e.ip : e.gameName) === v);
    });
    this.setData({
      conditions,
      records: records.map(r => ({
        _id: r._id,
        name: r.productName || r.gameName || '未命名',
        sub: r.type === 'guzi' ? (r.ip || '未填IP') : (r.gameReason || ''),
        amount: Format.formatAmount(r.totalAmount),
        icon: r.type === 'guzi' ? '◉' : '◆',
        dateLabel: Format.formatDate(new Date(r.date || r.createdAt))
      }))
    });
  },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/expense/detail?id=' + e.currentTarget.dataset.id });
  }
});
