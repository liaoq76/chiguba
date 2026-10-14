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
    trendAvg: '¥0',

    // 待收到
    pendingCount: 0,
    pendingPreview: [],

    // 最近 3 条
    recent: [],

    // 预算摘要
    budget: null,
    budgetRemain: '0',

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
    // 同步 custom-tab-bar 选中态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
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

    // 计算趋势平均：直接采用本月初至今日均消费（PRD 4.1.3 趋势卡）
    let avg = 0;
    if (tr.series && tr.series.day && tr.series.day.length) {
      const total = tr.series.day.reduce((a, b) => a + (b.value || 0), 0);
      // 取已有数据的日数
      const usedDays = tr.series.day.filter(s => s.value > 0).length || tr.series.day.length;
      avg = usedDays > 0 ? Math.round(total / Math.max(1, usedDays)) : 0;
    }

    // === 待收到 ===
    const pending = Stats.pendingPresaleCount(presales);
    // 取最近 6 条待收预售做横滑卡片
    const pendingPreview = presales
      .filter(p => p && p.status === 'pending')
      .sort((a, b) => new Date(a.expectedShip || 0) - new Date(b.expectedShip || 0))
      .slice(0, 6)
      .map(p => {
        const now = new Date();
        const ship = p.expectedShip ? new Date(p.expectedShip) : null;
        let daysLeft = 0;
        if (ship && !isNaN(ship.getTime())) {
          daysLeft = Math.max(0, Math.ceil((ship.getTime() - now.getTime()) / 86400000));
        }
        const firstImg = (p.images && p.images.length) ? p.images[0] : (p.image || '');
        const stage = p.stage || (p.deposit && !p.paidBalance ? '待付尾款' : (p.shipped ? '运输中' : '待发出'));
        return {
          _id: p._id,
          name: p.name || p.productName || '预售谷子',
          ip: p.ip || '',
          amount: Format.formatAmount(p.totalAmount || p.amount || 0),
          thumb: firstImg ? Image.resolveDisplay(firstImg) : '',
          daysLeft,
          stage,
          stageLabel: stage
        };
      });

    // === 最近 3 条 ===
    const recent = Stats.recentExpenses(expenses, 3).map(r => {
      const firstImg = (r.images && r.images.length) ? r.images[0] : null;
      const isGame = r.type === 'game' || r.type === 'guzi' && r.gameName;
      const isGameFinal = r.type === 'game';
      return {
        _id: r._id,
        name: r.productName || r.gameName || '未命名',
        amount: Format.formatAmount(r.totalAmount),
        icon: r.type === 'guzi' ? '◉' : '◆',
        typeLabel: r.type === 'guzi' ? '谷子' : '氪金',
        dateLabel: Format.formatRelative(r.date || r.createdAt),
        thumb: firstImg ? Image.resolveDisplay(firstImg) : '',
        ip: r.ip || r.gameName || '',
        character: r.role || r.character || '',
        channel: r.channel || '',
        statusLabel: r.statusLabel || '',
        statusType: (r.statusType === 'pending' ? 'pending' : 'done')
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
      trendAvg: Format.formatAmount(avg),
      pendingCount: pending,
      pendingPreview,
      recent,
      budget: b ? {
        typeLabel: b.type === 'total' ? '总预算' : (b.type === 'guzi' ? '谷子预算' : '游戏预算'),
        amount: Format.formatAmount(b.amount || 0),
        actual: Format.formatAmount(b.actual),
        percent: Math.min(b.percent, 1),
        rawPercent: Math.round((b.percent || 0) * 100),
        status: b.status,
        statusLabel: b.status === 'over' ? '已超预算' : (b.status === 'p100' ? '已满' : (b.status === 'p80' ? '接近预算' : '正常'))
      } : null,
      budgetRemain: b ? Format.formatAmount(Math.max(0, (b.amount || 0) - (b.actual || 0))) : '0',
      nickname: profile.nickname || '吃谷人',
      avatarURL: Profile.getAvatarURL()
    };
    this.setData(newData);

    if (typeof this.onSyncUpdate === 'function') {
      this.onSyncUpdate(app.globalData.pendingSyncCount || 0);
    }

    if (tr.series.day.length > 0) {
      this._renderHomeTrend(tr.series.day);
    }
  },

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
        const padL = 12, padR = 12, padT = 20, padB = 24;
        const innerW = W - padL - padR, innerH = H - padT - padB;

        const max = Math.max.apply(null, series.map(s => s.value));
        const peak = max === 0 ? 1 : max;

        // 网格
        ctx.strokeStyle = 'rgba(155,139,255,0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 3; i++) {
          const y = padT + (innerH * i / 3);
          ctx.beginPath();
          ctx.moveTo(padL, y);
          ctx.lineTo(W - padR, y);
          ctx.stroke();
        }

        // 渐变填充区
        const grad = ctx.createLinearGradient(0, padT, 0, padT + innerH);
        grad.addColorStop(0, 'rgba(255,148,185,0.30)');
        grad.addColorStop(1, 'rgba(255,148,185,0.00)');
        ctx.beginPath();
        ctx.fillStyle = grad;
        series.forEach((s, i) => {
          const x = padL + (innerW * i / Math.max(1, series.length - 1));
          const y = padT + innerH * (1 - s.value / peak);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.lineTo(padL + innerW, padT + innerH);
        ctx.lineTo(padL, padT + innerH);
        ctx.closePath();
        ctx.fill();

        // 折线（粉紫渐变）
        const lineGrad = ctx.createLinearGradient(padL, 0, padL + innerW, 0);
        lineGrad.addColorStop(0, '#FF94B9');
        lineGrad.addColorStop(1, '#9B8BFF');
        ctx.beginPath();
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
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
          ctx.fillStyle = s.value > 0 ? '#FF94B9' : 'rgba(160,170,192,0.4)';
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
    const id = e.currentTarget.dataset.id;
    const list = Storage.getExpenses();
    const rec = list.find(x => x._id === id);
    if (rec && rec.images && rec.images.length) {
      Image.preview(rec.images, rec.images[0]);
    }
  },

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
