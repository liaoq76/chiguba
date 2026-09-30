// pages/stats/ipDetail.js — IP 详情（PRD 4.5.12）
const Storage = require('../../utils/storage.js');
const Stats = require('../../utils/stats.js');
const Format = require('../../utils/format.js');

Page({
  data: {
    name: '',
    range: null,
    rangeLabel: '',
    rangeType: 'month',
    detail: null,
    productTypes: [],
    channels: [],
    roles: []
  },

  onLoad(options) {
    this.setData({
      name: decodeURIComponent(options.name),
      range: { start: Number(options.start), end: Number(options.end) }
    });
    this.refresh();
  },

  onShow() { this.refresh(); },

  refresh() {
    const expenses = Storage.getExpenses();
    const detail = Stats.ipDetail(expenses, this.data.range, this.data.name);
    const productTypes = Stats.productTypes(expenses, this.data.range).filter(x => Stats.ipDetail(expenses, this.data.range, this.data.name).records.some(r => r.productType === x.name));
    const channels = Stats.channels(expenses, this.data.range).filter(x => detail.records.some(r => r.channel === x.name));
    const roles = Stats.roles(expenses, this.data.range, this.data.name);

    const range = this.data.range;
    const s = new Date(range.start), e = new Date(range.end);
    this.setData({
      rangeLabel: `${s.getFullYear()}年${s.getMonth() + 1}月${s.getDate()}日 - ${e.getMonth() + 1}月${e.getDate()}日`,
      detail: {
        ...detail,
        total: Format.formatAmount(detail.total),
        guzi: Format.formatAmount(detail.guzi),
        game: Format.formatAmount(detail.game)
      },
      productTypes: productTypes.map(p => ({ ...p, amount: Format.formatAmount(p.total) })),
      channels: channels.map(c => ({ ...c, amount: Format.formatAmount(c.total) })),
      roles: roles.map(r => ({ ...r, amount: Format.formatAmount(r.total) }))
    });
  },

  switchRange(e) {
    const t = e.currentTarget.dataset.t;
    let range;
    if (t === 'week') range = Stats.weekRange();
    else if (t === 'month') range = Stats.currentMonthRange();
    else if (t === 'year') range = Stats.yearRange(new Date().getFullYear());
    else return;
    this.setData({ rangeType: t, range });
    this.refresh();
  }
});
