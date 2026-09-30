// pages/budget/budget.js — 预算（PRD 4.6）
const Storage = require('../../utils/storage.js');
const Budget = require('../../utils/budget.js');
const Format = require('../../utils/format.js');
const C = require('../../utils/constants.js');

Page({
  data: {
    // 总预算
    total: null,
    guzi: null,
    game: null,
    history: []
  },

  onLoad() { this.refresh(); },
  onShow() { this.refresh(); },

  refresh() {
    const fmt = b => {
      if (!b) return null;
      const range = Budget.getCycleRange(b.cycle || 'month');
      const actual = Budget.actualInRange(b.type, range.start, range.end);
      const status = Budget.computeStatus(b, actual);
      return {
        ...b,
        amount: Format.formatAmount(b.amount),
        actual: Format.formatAmount(actual),
        rawPercent: b.amount > 0 ? Math.min(Math.round(actual / b.amount * 100), 200) : 0,
        barWidth: b.amount > 0 ? Math.min(actual / b.amount, 1) : 0,
        cycleLabel: b.cycle === 'week' ? '周' : (b.cycle === 'month' ? '月' : '年'),
        rangeLabel: range.label,
        status,
        statusLabel: status === 'over' ? '已超' : (status === 'p100' ? '已满' : (status === 'p80' ? '接近' : '正常')),
        thresholds: b.thresholds || [80, 100, 'over']
      };
    };
    const total = fmt(Storage.getBudget(C.BUDGET_TYPE.TOTAL));
    const guzi = fmt(Storage.getBudget(C.BUDGET_TYPE.GUZI));
    const game = fmt(Storage.getBudget(C.BUDGET_TYPE.GAME));
    const history = Budget.getHistory(C.BUDGET_TYPE.TOTAL).map(p => ({
      ...p,
      amount: Format.formatAmount(p.amount),
      actual: Format.formatAmount(p.actualAmount || 0)
    }));

    this.setData({ total, guzi, game, history });
  },

  openBudget(e) {
    const type = e.currentTarget.dataset.type;
    this._editBudget(type, null);
  },

  _editBudget(type, current) {
    wx.showActionSheet({
      itemList: current && current.enabled ? ['修改金额', '修改阈值', '修改周期', '关闭预算'] : ['开启预算'],
      success: res => {
        if (!current || !current.enabled) {
          // 开启 — 询问金额
          this._askAmount(type, current, 0);
          return;
        }
        if (res.tapIndex === 0) this._askAmount(type, current, current.amount);
        else if (res.tapIndex === 1) this._pickThresholds(type, current);
        else if (res.tapIndex === 2) this._pickCycle(type, current);
        else if (res.tapIndex === 3) {
          // 关闭
          Budget.setBudget(type, { enabled: false, amount: current.amount });
          this.refresh();
        }
      }
    });
  },

  _askAmount(type, current, def) {
    wx.showModal({
      title: '设置预算金额',
      editable: true,
      placeholderText: '例如：1500',
      content: String(def),
      success: r => {
        if (r.confirm) {
          const amount = Number(r.content) || 0;
          if (amount < 0) return wx.showToast({ title: '金额不能为负', icon: 'none' });
          Budget.setBudget(type, {
            enabled: true,
            amount,
            cycle: current && current.cycle ? current.cycle : 'month',
            thresholds: current && current.thresholds ? current.thresholds : [80, 100, 'over']
          });
          this.refresh();
        }
      }
    });
  },

  _pickCycle(type, current) {
    wx.showActionSheet({
      itemList: ['周', '月', '年'],
      success: res => {
        const cycle = ['week', 'month', 'year'][res.tapIndex];
        Budget.setBudget(type, { cycle });
        this.refresh();
      }
    });
  },

  _pickThresholds(type, current) {
    // 简化为多选：固定 80、100、over
    const cur = current.thresholds || [];
    const next = Array.from(new Set(cur));
    wx.showActionSheet({
      itemList: next.indexOf(80) < 0 ? '＋ 80% 提醒' : '− 关闭 80% 提醒',
      success: () => {
        const i = next.indexOf(80);
        if (i < 0) next.push(80); else next.splice(i, 1);
        Budget.setBudget(type, { thresholds: next });
        this.refresh();
      }
    });
  }
});
