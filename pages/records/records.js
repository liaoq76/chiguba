// pages/records/records.js
const Storage = require('../../utils/storage.js');
const Format = require('../../utils/format.js');

Page({
  data: {
    categories: [],
    activeCat: 'all',
    keyword: '',
    groups: [],
    monthTotal: '0',
    total: '0',
    empty: false
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    let records = Storage.getRecords();
    const categories = Storage.getCategories();

    // 关键字过滤
    if (this.data.keyword) {
      const kw = this.data.keyword.toLowerCase();
      records = records.filter(r =>
        (r.title || '').toLowerCase().includes(kw) ||
        (r.note || '').toLowerCase().includes(kw)
      );
    }
    // 分类过滤
    if (this.data.activeCat !== 'all') {
      records = records.filter(r => r.categoryId === this.data.activeCat);
    }

    // 按日分组
    const dayMap = Format.groupByDay(records);
    const groups = Object.keys(dayMap).sort((a, b) => b.localeCompare(a)).map(day => {
      const list = dayMap[day].sort((x, y) => y.createdAt - x.createdAt).map(r => {
        const cat = categories.find(c => c.id === r.categoryId) || {};
        return Object.assign({}, r, {
          amount: Format.formatAmount(r.amount),
          timeLabel: Format.formatDate(r.createdAt, true).slice(11),
          categoryName: cat.name || '未分类',
          categoryIcon: cat.icon || '📦',
          categoryColor: cat.color || '#bbb'
        });
      });
      const dayTotal = Format.sum(dayMap[day]);
      return {
        day,
        dayTotal: Format.formatAmount(dayTotal),
        list
      };
    });

    this.setData({
      categories,
      groups,
      total: Format.formatAmount(Format.sum(records)),
      monthTotal: Format.formatAmount(Format.sum(
        records.filter(r => Format.getMonth(r.createdAt) === Format.getMonth(Date.now()))
      )),
      empty: groups.length === 0
    });
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value });
    this.refresh();
  },

  switchCat(e) {
    this.setData({ activeCat: e.currentTarget.dataset.id });
    this.refresh();
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
  },

  goAdd() {
    wx.switchTab({ url: '/pages/add/add' });
  }
});