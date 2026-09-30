// pages/stats/stats.js — 消费统计总览（PRD 4.5）
const Storage = require('../../utils/storage.js');
const Stats = require('../../utils/stats.js');
const Format = require('../../utils/format.js');
const C = require('../../utils/constants.js');

Page({
  data: {
    // 时间范围
    rangeType: 'month',          // week / month / year / custom
    range: Stats.currentMonthRange(),
    rangeLabel: '',

    // 总览
    total: '¥0',
    count: 0,
    guzi: '¥0',
    game: '¥0',

    // 趋势
    trendMode: 'cumulative',     // cumulative / actual
    trendSeries: [],

    // 构成
    composition: { total: 0, items: [] },

    // IP
    ipTop: [],
    ipOther: null,
    ipBlank: null,
    expandedIp: null
  },

  onLoad() {
    this.setData({ rangeLabel: this._label(this.data.range) });
    this.refresh();
  },

  onShow() { this.refresh(); },

  _label(range) {
    const s = new Date(range.start), e = new Date(range.end);
    const sy = s.getFullYear(), sm = s.getMonth() + 1, sd = s.getDate();
    const ey = e.getFullYear(), em = e.getMonth() + 1, ed = e.getDate();
    if (this.data.rangeType === 'week') return `${sy}年${sm}月${sd}日 - ${em}月${ed}日`;
    if (this.data.rangeType === 'month') return `${sy}年${sm}月`;
    if (this.data.rangeType === 'year') return `${sy}年`;
    return `${sy}/${sm}/${sd} - ${ey}/${em}/${ed}`;
  },

  switchRange(e) {
    const t = e.currentTarget.dataset.t;
    let range;
    if (t === 'week') range = Stats.weekRange();
    else if (t === 'month') range = Stats.currentMonthRange();
    else if (t === 'year') range = Stats.yearRange(new Date().getFullYear());
    else return;
    this.setData({ rangeType: t, range, rangeLabel: this._label({ ...this.data.range, ...range }) });
    this.refresh();
  },

  switchTrend(e) {
    this.setData({ trendMode: e.currentTarget.dataset.m });
    this.refresh();
  },

  refresh() {
    const expenses = Storage.getExpenses();
    const range = this.data.range;

    // 总览
    const ov = Stats.overview(expenses, range);
    // 趋势
    const series = Stats.trend(expenses, range, this.data.trendMode);
    // 构成
    const comp = Stats.composition(expenses, range);
    // IP
    const ip = Stats.ipStats(expenses, range);

    this.setData({
      total: Format.formatAmount(ov.total),
      count: ov.count,
      guzi: Format.formatAmount(comp.items.find(x => x.key === 'guzi').value),
      game: Format.formatAmount(comp.items.find(x => x.key === 'game').value),
      trendSeries: series,
      composition: comp,
      ipTop: ip.top.map(x => ({
        ...x,
        amount: Format.formatAmount(x.total),
        percent: Format.formatPercent(x.percent)
      })),
      ipOther: ip.other ? {
        ...ip.other,
        amount: Format.formatAmount(ip.other.total),
        percent: Format.formatPercent(ip.other.percent)
      } : null,
      ipBlank: ip.blank ? {
        ...ip.blank,
        amount: Format.formatAmount(ip.blank.total),
        percent: Format.formatPercent(ip.blank.percent)
      } : null,
      rangeLabel: this._label(range)
    });

    // 绘制趋势图
    if (series.length > 0) this._renderTrend(series);

    // 绘制环形图
    this._renderRing(comp);
  },

  _renderTrend(series) {
    const query = wx.createSelectorQuery();
    query.select('#statsTrend').fields({ node: true, size: true }).exec(res => {
      if (!res || !res[0] || !res[0].node) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio;
      canvas.width = res[0].width * dpr;
      canvas.height = res[0].height * dpr;
      ctx.scale(dpr, dpr);
      const W = res[0].width, H = res[0].height;
      const padL = 30, padR = 12, padT = 16, padB = 26;
      const innerW = W - padL - padR, innerH = H - padT - padB;

      const max = Math.max.apply(null, series.map(s => s.value));
      const peak = max === 0 ? 1 : max;

      // 网格 + Y 轴标签
      ctx.strokeStyle = '#e8dfd2';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#9a8f80';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      for (let i = 0; i <= 3; i++) {
        const y = padT + (innerH * i / 3);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(W - padR, y);
        ctx.stroke();
        ctx.fillText(Math.round(peak * (1 - i / 3)).toString(), padL - 4, y + 4);
      }

      // 折线
      ctx.beginPath();
      ctx.strokeStyle = '#b6433a';
      ctx.lineWidth = 2;
      series.forEach((s, i) => {
        const x = padL + (innerW * i / Math.max(1, series.length - 1));
        const y = padT + innerH * (1 - s.value / peak);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // 圆点
      series.forEach((s, i) => {
        const x = padL + (innerW * i / Math.max(1, series.length - 1));
        const y = padT + innerH * (1 - s.value / peak);
        ctx.beginPath();
        ctx.fillStyle = s.value > 0 ? '#b6433a' : '#e8dfd2';
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  },

  _renderRing(comp) {
    const query = wx.createSelectorQuery();
    query.select('#statsRing').fields({ node: true, size: true }).exec(res => {
      if (!res || !res[0] || !res[0].node) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio;
      canvas.width = res[0].width * dpr;
      canvas.height = res[0].height * dpr;
      ctx.scale(dpr, dpr);
      const W = res[0].width, H = res[0].height;
      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) / 2 - 20;
      const inner = R * 0.6;

      if (comp.total === 0) {
        ctx.fillStyle = '#faf6ef';
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e8dfd2';
        ctx.lineWidth = 1;
        ctx.stroke();
        return;
      }

      const colors = { guzi: '#b6433a', game: '#3a6b6b' };
      let start = -Math.PI / 2;
      comp.items.forEach(it => {
        if (it.value <= 0) return;
        const angle = (it.value / comp.total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, start, start + angle);
        ctx.closePath();
        ctx.fillStyle = colors[it.key] || '#999';
        ctx.fill();
        start += angle;
      });

      // 中心空
      ctx.beginPath();
      ctx.arc(cx, cy, inner, 0, Math.PI * 2);
      ctx.fillStyle = '#faf6ef';
      ctx.fill();

      // 中心文字
      ctx.fillStyle = '#b6433a';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(Format.formatAmount(comp.total), cx, cy - 6);
      ctx.fillStyle = '#9a8f80';
      ctx.font = '11px sans-serif';
      ctx.fillText('总消费', cx, cy + 14);
    });
  },

  expandIp(e) {
    const name = e.currentTarget.dataset.name;
    const expanded = this.data.expandedIp === name ? null : name;
    this.setData({ expandedIp: expanded });
  },

  goIpDetail(e) {
    const name = e.currentTarget.dataset.name;
    wx.navigateTo({ url: '/pages/stats/ipDetail?name=' + encodeURIComponent(name) + '&start=' + this.data.range.start + '&end=' + this.data.range.end });
  },

  // 触摸趋势点 → 提示日期+金额（PRD 决策188）
  onTrendTouch(e) {
    const series = this.data.trendSeries;
    if (!series || series.length === 0) return;
    const query = wx.createSelectorQuery();
    query.select('#statsTrend').boundingClientRect().exec(res => {
      if (!res || !res[0]) return;
      const rect = res[0];
      const x = e.touches[0].x - rect.left;
      const idx = Math.round(x / rect.width * (series.length - 1));
      const s = series[idx];
      if (s) {
        const label = this.data.rangeType === 'year' ? s.date : (s.date + '日');
        wx.showToast({ title: `${label} ¥${s.value.toFixed(0)}`, icon: 'none', duration: 1500 });
      }
    });
  }
});
