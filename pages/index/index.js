// pages/index/index.js
const Storage = require('../../utils/storage.js');
const Stats = require('../../utils/stats.js');
const Format = require('../../utils/format.js');

Page({
  data: {
    monthTotal: '0',
    todayTotal: '0',
    monthCount: 0,
    budget: 0,
    budgetPercent: 0,
    categories: [],
    topCategories: [],
    recent: [],
    greeting: ''
  },

  onShow() {
    this.refresh();
    this.setGreeting();
  },

  refresh() {
    const records = Storage.getRecords();
    const categories = Storage.getCategories();
    const { start, end } = Stats.currentMonthRange();
    const sum = Stats.summarizeByRange(records, start, end);

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
    const todaySum = Stats.summarizeByRange(records, todayStart, todayEnd);

    const top = Stats.topCategories(sum.byCategory, categories, 4).map(t => ({
      ...t,
      amount: Format.formatAmount(t.amount)
    }));

    const budget = Storage.getBudget();
    const percent = budget > 0 ? Math.min(100, Math.round((sum.total / budget) * 100)) : 0;

    const recent = sum.records.slice(0, 5).map(r => {
      const cat = categories.find(c => c.id === r.categoryId) || {};
      return Object.assign({}, r, {
        amount: Format.formatAmount(r.amount),
        dateLabel: Format.formatDate(r.createdAt, true),
        categoryName: cat.name || '未分类',
        categoryIcon: cat.icon || '📦',
        categoryColor: cat.color || '#bbb'
      });
    });

    this.setData({
      monthTotal: Format.formatAmount(sum.total),
      monthCount: sum.count,
      todayTotal: Format.formatAmount(todaySum.total),
      categories,
      topCategories: top,
      recent,
      budget,
      budgetPercent: percent
    });
  },

  setGreeting() {
    const h = new Date().getHours();
    let g = '晚上好';
    if (h < 6) g = '凌晨好';
    else if (h < 11) g = '早上好';
    else if (h < 14) g = '中午好';
    else if (h < 18) g = '下午好';
    const profile = Storage.getProfile();
    this.setData({ greeting: `${g}，${profile.nickname || '吃谷人'}～` });
  },

  goAdd() { wx.switchTab({ url: '/pages/add/add' }); },
  goRecords() { wx.switchTab({ url: '/pages/records/records' }); },
  goStats() { wx.switchTab({ url: '/pages/stats/stats' }); },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
  },

  onPullDownRefresh() {
    this.refresh();
    wx.stopPullDownRefresh();
  }
});