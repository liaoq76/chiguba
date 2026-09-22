// pages/stats/stats.js
const Storage = require('../../utils/storage.js');
const Format = require('../../utils/format.js');
const Stats = require('../../utils/stats.js');

Page({
  data: {
    rangeIndex: 0, // 0:本月 1:近30天 2:全部
    monthLabel: '',
    total: '0',
    count: 0,
    avgPerDay: '0',
    topList: [],
    monthList: [],
    records: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const records = Storage.getRecords();
    const categories = Storage.getCategories();

    let start, end, label = '';
    const now = new Date();
    if (this.data.rangeIndex === 0) {
      const r = Stats.monthRange(now.getFullYear(), now.getMonth());
      start = r.start; end = r.end;
      label = `${now.getFullYear()}年${now.getMonth() + 1}月`;
    } else if (this.data.rangeIndex === 1) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      start = today - 29 * 24 * 60 * 60 * 1000;
      end = today + 24 * 60 * 60 * 1000 - 1;
      label = '近 30 天';
    } else {
      start = 0; end = Date.now();
      label = '全部时间';
    }

    const sum = Stats.summarizeByRange(records, start, end);
    const top = Stats.topCategories(sum.byCategory, categories, 10).map(t => ({
      ...t,
      amount: Format.formatAmount(t.amount),
      percent: sum.total > 0 ? Math.round((t.amount / sum.total) * 100) : 0
    }));

    // 月度柱状数据（最多近 6 个月）
    const monthMap = {};
    records.forEach(r => {
      const k = Format.getMonth(r.createdAt);
      monthMap[k] = (monthMap[k] || 0) + Number(r.amount);
    });
    const sortedMonths = Object.keys(monthMap).sort().reverse().slice(0, 6).reverse();
    const maxMonth = Math.max.apply(null, sortedMonths.map(k => monthMap[k])) || 1;
    const monthList = sortedMonths.map(k => ({
      month: k,
      amount: Format.formatAmount(monthMap[k]),
      height: Math.max(8, Math.round((monthMap[k] / maxMonth) * 160))
    }));

    const days = Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)));
    const avg = sum.total / days;

    this.setData({
      monthLabel: label,
      total: Format.formatAmount(sum.total),
      count: sum.count,
      avgPerDay: Format.formatAmount(avg),
      topList: top,
      monthList,
      records: sum.records
    });
  },

  switchRange(e) {
    this.setData({ rangeIndex: Number(e.currentTarget.dataset.index) });
    this.refresh();
  }
});