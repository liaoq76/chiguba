// pages/index/index.js — 首页（PRD 4.1）
const app = getApp();
const Storage = require('../../utils/storage.js');
const Stats = require('../../utils/stats.js');
const Budget = require('../../utils/budget.js');
const Format = require('../../utils/format.js');
const Sync = require('../../utils/sync.js');
const Image = require('../../utils/image.js');
const Profile = require('../../utils/profile.js');

Page({
  data: {
    _trendInset: { paddingTop: 16, paddingBottom: 16, paddingLeft: 8, paddingRight: 8 },
    _trendTooltip: null,
    // 本月消费
    monthTotal: '¥0',
    guziTotal: '¥0',
    gameTotal: '¥0',
    monthCount: 0,

    // 趋势
    trendSeries: [],
    prevTotal: '¥0',
    curTotal: '¥0',
    monthLabel: '',

    // 待收到
    pendingCount: 0,

    // 最近 3 条
    recent: [],

    // 预算摘要
    budget: null,

    // 同步状态
    online: true,
    pendingSync: 0,

    // 用户名
    nickname: '吃谷人',

    // 头像
    avatarURL: ''
  },

  onLoad() {
    const profile = Storage.getProfile();
    this.setData({
      nickname: profile.nickname || '吃谷人',
      avatarURL: Profile.getAvatarURL()
    });
  },

  onShow() {
    this.refresh();
  },

  onPullDownRefresh() {
    this.refresh();
    wx.stopPullDownRefresh();
  },

  onNetworkChange(online) {
    this.setData({ online });
  },

  onSyncUpdate(count) {
    this.setData({ pendingSync: count });
  },

  refresh() {
    const expenses = Storage.getExpenses();
    const presales = Storage.getPresales();

    // === 本月消费 ===
    const range = Stats.currentMonthRange();
    const ov = Stats.overview(expenses, range);

    // === 趋势 ===
    const tr = Stats.homeMonthlyTrend(expenses);

    // === 待收到 ===
    const pending = Stats.pendingPresaleCount(presales);

    // === 最近 3 条 ===
    const recent = Stats.recentExpenses(expenses, 3).map(r => {
      const firstImg = (r.images && r.images.length) ? r.images[0] : null;
      return {
        _id: r._id,
        name: r.productName || r.gameName || '未命名',
        amount: Format.formatAmount(r.totalAmount),
        icon: r.type === 'guzi' ? '◉' : '◆',
        dateLabel: Format.formatRelative(r.date || r.createdAt),
        thumb: firstImg ? Image.resolveDisplay(firstImg) : ''
      };
    });

    // === 预算摘要 ===
    const b = Budget.getHomeBudgetSummary();

    const profile = Storage.getProfile();
    const newData = {
      monthTotal: Format.formatAmount(ov.total),
      guziTotal: Format.formatAmount(ov.guzi),
      gameTotal: Format.formatAmount(ov.game),
      monthCount: ov.count,
      trendSeries: tr.series.day,
      prevTotal: Format.formatAmount(tr.prevTotal),
      curTotal: Format.formatAmount(tr.curTotal),
      monthLabel: Format.formatMonth(new Date()),
      pendingCount: pending,
      recent,
      budget: b ? {
        typeLabel: b.type === 'total' ? '总预算' : (b.type === 'guzi' ? '谷子预算' : '游戏预算'),
        actual: Format.formatAmount(b.actual),
        percent: Math.min(b.percent, 1),
        rawPercent: Math.round((b.percent || 0) * 100),
        status: b.status,
        statusLabel: b.status === 'over' ? '已超预算' : (b.status === 'p100' ? '已满' : (b.status === 'p80' ? '接近预算' : '正常'))
      } : null,
      nickname: profile.nickname || '吃谷人',
      avatarURL: Profile.getAvatarURL()
    };
    this.setData(newData);

    // 同步一次 pendingSync（页面可能刚 onShow，还未收到 onSyncUpdate）
    if (typeof this.onSyncUpdate === 'function') {
      this.onSyncUpdate(app.globalData.pendingSyncCount || 0);
    }

    // 绘制首页趋势（实际消费，每日）
    if (tr.series.day.length > 0) {
      this._renderHomeTrend(tr.series.day);
    }
  },

  // 首页趋势（手写 Canvas 2d — 轻量、避免引入 ECharts 依赖到首页）
  _renderHomeTrend(series) {
    const query = wx.createSelectorQuery();
    query.select('#homeTrend')
      .fields({ node: true, size: true })
      .exec(res => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        const W = res[0].width, H = res[0].height;
        const padL = 8, padR = 8, padT = 16, padB = 16;
        const innerW = W - padL - padR, innerH = H - padT - padB;

        // 数据归一化
        const max = Math.max.apply(null, series.map(s => s.value));
        const peak = max === 0 ? 1 : max;

        // 网格
        ctx.strokeStyle = '#e8dfd2';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 3; i++) {
          const y = padT + (innerH * i / 3);
          ctx.beginPath();
          ctx.moveTo(padL, y);
          ctx.lineTo(W - padR, y);
          ctx.stroke();
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

  onTrendTouch(e) {
    const series = this.data.trendSeries;
    if (!series || series.length === 0) return;
    const query = wx.createSelectorQuery();
    query.select('#homeTrend').boundingClientRect().exec(res => {
      if (!res || !res[0]) return;
      const rect = res[0];
      const x = e.touches[0].x - rect.left;
      const idx = Math.round(x / rect.width * (series.length - 1));
      const s = series[idx];
      if (s) {
        wx.showToast({
          title: `${s.day}日 ¥${s.value.toFixed(0)}`,
          icon: 'none',
          duration: 1500
        });
      }
    });
  },

  goAdd() { wx.switchTab({ url: '/pages/add/add' }); },
  goExpense() { wx.switchTab({ url: '/pages/expense/expense' }); },
  goCollection() { wx.switchTab({ url: '/pages/collection/collection' }); },
  goStats() { wx.navigateTo({ url: '/pages/stats/stats' }); },
  goBudget() { wx.navigateTo({ url: '/pages/budget/budget' }); },
  goPresale() { wx.navigateTo({ url: '/pages/presale/presale' }); },
  goRecentDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/expense/detail?id=' + id });
  },

  goMine() {
    wx.switchTab({ url: '/pages/mine/mine' });
  },

  onTapThumb(e) {
    // 阻止冒泡触发列表项的跳转
    const id = e.currentTarget.dataset.id;
    const list = Storage.getExpenses();
    const rec = list.find(x => x._id === id);
    if (rec && rec.images && rec.images.length) {
      Image.preview(rec.images, rec.images[0]);
    }
  },

  // 填演示数据
  fillDemo() {
    wx.showModal({
      title: '填充演示数据',
      content: '将清空当前数据并填充示例，确认继续？',
      success: r => {
        if (r.confirm) {
          const Demo = require('../../utils/demo.js');
          Demo.fillDemo();
          this.refresh();
          wx.showToast({ title: '已填充', icon: 'success' });
        }
      }
    });
  }
});
