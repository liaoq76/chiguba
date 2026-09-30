// utils/budget.js — 预算（PRD 4.6）
// 规则：
//   - 三类预算独立（PRD 4.6.4）：total / guzi / game
//   - 关闭不删除配置，重新开启恢复上次金额（PRD 4.6.8 / 决策119）
//   - 关闭期间消费不参与该预算计算（PRD 4.6.8）
//   - 阈值 80/100/over，每阈值每周期最多提醒一次（PRD 4.6.5 / 决策94）
//   - 状态只显示最高一级最新（PRD 4.6.7 / 决策116）

const Storage = require('./storage.js');
const Sync = require('./sync.js');
const C = require('./constants.js');

// === 当前周期计算 ===

function getCycleRange(cycle, baseDate) {
  const d = baseDate || new Date();
  let start, end;
  if (cycle === C.BUDGET_CYCLE.WEEK) {
    // 周一为起点
    const day = d.getDay() || 7;
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + 1);
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  } else if (cycle === C.BUDGET_CYCLE.MONTH) {
    start = new Date(d.getFullYear(), d.getMonth(), 1);
    end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  } else if (cycle === C.BUDGET_CYCLE.YEAR) {
    start = new Date(d.getFullYear(), 0, 1);
    end = new Date(d.getFullYear() + 1, 0, 1);
  }
  return {
    start: start.getTime(),
    end: end.getTime() - 1,
    label: formatRangeLabel(start, end, cycle)
  };
}

function formatRangeLabel(start, end, cycle) {
  const sd = new Date(start);
  const ed = new Date(end);
  const sm = sd.getMonth() + 1;
  const em = ed.getMonth() + 1;
  const sy = sd.getFullYear();
  const ey = ed.getFullYear();
  if (cycle === C.BUDGET_CYCLE.WEEK) {
    return `${sm}月${sd.getDate()}日 - ${em}月${ed.getDate()}日`;
  }
  if (cycle === C.BUDGET_CYCLE.MONTH) {
    return `${sy}年${sm}月`;
  }
  return `${sy}年`;
}

// === 实际消费（按类型） ===
function actualInRange(type, start, end, expenses) {
  const list = expenses || Storage.getExpenses();
  let total = 0;
  list.forEach(e => {
    const ts = e.date || e.createdAt || 0;
    if (ts < start || ts > end) return;
    if (e.totalAmount === 0) return;          // ¥0 不参与
    if (type === C.BUDGET_TYPE.GUZI && e.type !== 'guzi') return;
    if (type === C.BUDGET_TYPE.GAME && e.type !== 'game') return;
    if (type === C.BUDGET_TYPE.TOTAL) { /* 全部 */ }
    total += Number(e.totalAmount) || 0;
  });
  return total;
}

// === 计算单个预算的状态 ===
function computeStatus(budget, actual) {
  if (!budget || !budget.enabled) return null;
  if (!budget.amount || budget.amount <= 0) return null;

  const percent = actual / budget.amount;
  const thresholds = budget.thresholds || [80, 100, 'over'];

  let status = C.BUDGET_STATUS.SAFE;
  if (actual > budget.amount) status = C.BUDGET_STATUS.OVER;
  else if (percent >= 1 && thresholds.indexOf(100) >= 0) status = C.BUDGET_STATUS.P100;
  else if (percent >= 0.8 && thresholds.indexOf(80) >= 0) status = C.BUDGET_STATUS.P80;

  // 状态只显示更高一级最新（决策116）
  return status;
}

// 设置预算（开启 / 修改 / 关闭）
function setBudget(type, patch) {
  const current = Storage.getBudget(type) || {
    _id: 'bg_' + type + '_' + Date.now(),
    type,
    enabled: false,
    amount: 0,
    cycle: C.BUDGET_CYCLE.MONTH,
    thresholds: [80, 100, 'over'],
    closedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const merged = Object.assign({}, current, patch, { updatedAt: Date.now() });
  if (patch.enabled === false && current.enabled) {
    merged.closedAt = Date.now();
    merged.lastAmount = current.amount;        // 关闭前记录金额，重新开启恢复（决策119）
  }
  if (patch.enabled === true && !current.enabled) {
    // 重新开启 → 恢复上次金额
    if (current.lastAmount !== undefined) {
      merged.amount = current.lastAmount;
    }
    merged.closedAt = null;
  }

  Storage.upsertBudget(merged);
  Sync.enqueue('budget', merged.enabled ? 'update' : 'update', merged);

  // 如果开启了，记录当前周期（用于历史保留）
  if (merged.enabled) {
    const range = getCycleRange(merged.cycle);
    addOrUpdateCurrentPeriod(merged, range);
  }

  return merged;
}

function addOrUpdateCurrentPeriod(budget, range) {
  const periods = Storage.getBudgetPeriods();
  const key = budget.type + '_' + range.start;
  const exist = periods.find(p => p.key === key);
  if (exist) return exist;

  const record = {
    _id: 'bp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    key,
    budgetId: budget._id,
    type: budget.type,
    cycle: budget.cycle,
    amount: budget.amount,
    range: { start: range.start, end: range.end, label: range.label },
    actualAmount: 0,
    status: C.BUDGET_STATUS.SAFE,
    thresholdNotified: {},         // { p80: true, p100: true, over: true }
    createdAt: Date.now()
  };
  Storage.addBudgetPeriod(record);
  Sync.enqueue('budgetPeriod', 'add', record);
  return record;
}

// 重新计算当前周期的实际消费（每次写入消费后调用）
function recalcCurrentPeriods() {
  const expenses = Storage.getExpenses();
  const budgets = Storage.getBudgets();
  const periods = Storage.getBudgetPeriods();

  budgets.forEach(b => {
    if (!b.enabled) return;
    const range = getCycleRange(b.cycle);
    const key = b.type + '_' + range.start;
    let p = periods.find(x => x.key === key);
    if (!p) p = addOrUpdateCurrentPeriod(b, range);

    const actual = actualInRange(b.type, range.start, range.end, expenses);
    const oldStatus = p.status;
    p.actualAmount = actual;
    p.status = computeStatus(b, actual);

    // 阈值通知标记（每阈值每周期只提醒一次 — 决策94）
    [80, 100, 'over'].forEach(t => {
      if (p.status === (t === 80 ? C.BUDGET_STATUS.P80 : t === 100 ? C.BUDGET_STATUS.P100 : C.BUDGET_STATUS.OVER)) {
        p.thresholdNotified = p.thresholdNotified || {};
        p.thresholdNotified[t] = true;
      }
    });

    Storage.setBudgetPeriods([...periods]);
    Sync.enqueue('budgetPeriod', 'update', p);
  });
}

// 首页展示：返回每个预算的简报（按优先级 — PRD 4.1.6）
function getHomeBudgetSummary() {
  const expenses = Storage.getExpenses();
  const budgets = Storage.getBudgets().filter(b => b.enabled);
  if (budgets.length === 0) return null;

  const summaries = budgets.map(b => {
    const range = getCycleRange(b.cycle);
    const actual = actualInRange(b.type, range.start, range.end, expenses);
    const status = computeStatus(b, actual);
    return {
      type: b.type,
      amount: b.amount,
      actual,
      percent: b.amount > 0 ? Math.min(actual / b.amount, 2) : 0,
      status
    };
  });

  // 总预算优先（PRD 4.1.6）
  const total = summaries.find(s => s.type === C.BUDGET_TYPE.TOTAL);
  if (total) return total;
  return summaries[0];
}

// 历史周期（最近一年，最多 12 个月 — PRD 4.6.10 / 决策96）
function getHistory(type) {
  const all = Storage.getBudgetPeriods().filter(p => p.type === type);
  // 按 range.start 降序，取最近 C.BUDGET_HISTORY_LIMIT 条
  return all.sort((a, b) => b.range.start - a.range.start).slice(0, C.BUDGET_HISTORY_LIMIT);
}

module.exports = {
  getCycleRange,
  actualInRange,
  computeStatus,
  setBudget,
  recalcCurrentPeriods,
  getHomeBudgetSummary,
  getHistory,
  formatRangeLabel
};
