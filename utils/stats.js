// utils/stats.js — 统计计算（PRD 4.5）
// 关键规则：
//   - ¥0 完全排除（PRD 5.6 / 决策219/220/223）
//   - 金额直接使用当前保存的总金额（PRD 5.6 / 决策224）
//   - IP Top5 + 其他 + 未填写IP 三档（PRD 4.5.7/4.5.9/4.5.11）
//   - 未填写IP计入总额与占比分母，但不占排名（PRD 4.5.9）
//   - 真实IP超过5个才显示其他（PRD 4.5.11）

const C = require('./constants.js');

// 排除¥0，过滤时间范围
function _filter(expenses, start, end, typeFilter) {
  return expenses.filter(e => {
    if ((e.totalAmount || 0) <= 0) return false;            // ¥0 排除
    const ts = e.date || e.createdAt || 0;
    if (ts < start || ts > end) return false;
    if (typeFilter && e.type !== typeFilter) return false;
    return true;
  });
}

// 时间范围工具
function monthRange(year, month) {
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 1).getTime() - 1;
  return { start, end };
}

function currentMonthRange() {
  const d = new Date();
  return monthRange(d.getFullYear(), d.getMonth());
}

function weekRange() {
  const d = new Date();
  const day = d.getDay() || 7;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + 1).getTime();
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + 1 + 7).getTime() - 1;
  return { start, end };
}

function yearRange(year) {
  return {
    start: new Date(year, 0, 1).getTime(),
    end: new Date(year + 1, 0, 1).getTime() - 1
  };
}

// 决定趋势粒度（PRD 4.5.5 / 决策143）
function decideGranularity(start, end) {
  const days = Math.ceil((end - start) / 86400000);
  if (days <= 31) return 'day';
  return 'month';
}

// === 总览 ===
function overview(expenses, range) {
  const list = _filter(expenses, range.start, range.end);
  let total = 0, guzi = 0, game = 0, count = 0;
  list.forEach(e => {
    total += Number(e.totalAmount) || 0;
    count++;
    if (e.type === 'guzi') guzi += Number(e.totalAmount) || 0;
    else if (e.type === 'game') game += Number(e.totalAmount) || 0;
  });
  return { total, guzi, game, count, records: list };
}

// === 趋势（累计或实际）===
function trend(expenses, range, mode) {
  const list = _filter(expenses, range.start, range.end);
  const granularity = decideGranularity(range.start, range.end);

  if (granularity === 'day') {
    const map = {};
    // 填充每一天（无消费 = 0）
    const startDay = new Date(range.start);
    const endDay = new Date(range.end);
    for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
      const key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      map[key] = { date: key, value: 0, timestamp: d.getTime() };
    }
    list.forEach(e => {
      const d = new Date(e.date || e.createdAt);
      const key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      if (!map[key]) map[key] = { date: key, value: 0, timestamp: d.getTime() };
      map[key].value += Number(e.totalAmount) || 0;
    });
    const series = Object.values(map).sort((a, b) => a.timestamp - b.timestamp);

    if (mode === C.TREND_MODE.CUMULATIVE) {
      let cum = 0;
      // 累计从范围内第一次消费开始（决策189）
      const firstIdx = series.findIndex(s => s.value > 0);
      const sliced = firstIdx >= 0 ? series.slice(firstIdx) : [];
      return sliced.map(s => { cum += s.value; return { date: s.date, timestamp: s.timestamp, value: cum }; });
    }
    return series;
  } else {
    // 按月
    const map = {};
    list.forEach(e => {
      const d = new Date(e.date || e.createdAt);
      const key = d.getFullYear() + '-' + (d.getMonth() + 1);
      if (!map[key]) map[key] = { date: key, value: 0, timestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime() };
      map[key].value += Number(e.totalAmount) || 0;
    });
    const series = Object.values(map).sort((a, b) => a.timestamp - b.timestamp);
    if (mode === C.TREND_MODE.CUMULATIVE) {
      let cum = 0;
      return series.map(s => { cum += s.value; return { date: s.date, timestamp: s.timestamp, value: cum }; });
    }
    return series;
  }
}

// === 消费构成（环形图数据）===
function composition(expenses, range) {
  const list = _filter(expenses, range.start, range.end);
  let guzi = 0, game = 0;
  list.forEach(e => {
    if (e.type === 'guzi') guzi += Number(e.totalAmount) || 0;
    else if (e.type === 'game') game += Number(e.totalAmount) || 0;
  });
  const total = guzi + game;
  return {
    total,
    items: [
      { key: 'guzi', label: '谷子/周边', value: guzi, percent: total > 0 ? guzi / total : 0 },
      { key: 'game', label: '游戏氪金', value: game, percent: total > 0 ? game / total : 0 }
    ]
  };
}

// === IP 统计（PRD 4.5.7-4.5.11）===
function ipStats(expenses, range) {
  const list = _filter(expenses, range.start, range.end);
  const map = {};
  let total = 0;

  list.forEach(e => {
    const amount = Number(e.totalAmount) || 0;
    total += amount;
    let key;
    if (e.type === 'guzi') key = (e.ip || '').trim() || '__BLANK__';
    else if (e.type === 'game') key = (e.gameName || '').trim() || '__BLANK__';
    else key = '__BLANK__';

    if (!map[key]) map[key] = {
      key, name: key === '__BLANK__' ? '未填写IP' : key,
      total: 0, count: 0, guzi: 0, game: 0
    };
    map[key].total += amount;
    map[key].count++;
    if (e.type === 'guzi') map[key].guzi += amount;
    else if (e.type === 'game') map[key].game += amount;
  });

  const allIPs = Object.values(map);
  const blankIP = allIPs.find(x => x.key === '__BLANK__');
  const realIPs = allIPs.filter(x => x.key !== '__BLANK__').sort((a, b) => b.total - a.total);

  // Top N + 其他
  const topN = C.IP_TOP_N;
  const top = realIPs.slice(0, topN);
  const others = realIPs.slice(topN);
  const otherTotal = others.reduce((s, x) => s + x.total, 0);

  // 占比分母为全部消费金额（含未填写IP — PRD 5.6 / 决策205）
  const denom = total > 0 ? total : 1;

  const topWithPct = top.map(x => Object.assign({}, x, { percent: x.total / denom }));
  const otherItem = others.length > 0 ? {
    key: '__OTHERS__',
    name: '其他',
    total: otherTotal,
    count: others.reduce((s, x) => s + x.count, 0),
    guzi: others.reduce((s, x) => s + x.guzi, 0),
    game: others.reduce((s, x) => s + x.game, 0),
    percent: otherTotal / denom,
    restCount: others.length,
    restList: others
  } : null;

  return {
    total,
    top: topWithPct,
    other: otherItem,
    blank: blankIP ? Object.assign({}, blankIP, { percent: blankIP.total / denom }) : null
  };
}

// === 某 IP 详情（PRD 4.5.12）===
function ipDetail(expenses, range, ipName) {
  const list = _filter(expenses, range.start, range.end).filter(e => {
    if (e.type === 'guzi') return (e.ip || '').trim() === ipName;
    if (e.type === 'game') return (e.gameName || '').trim() === ipName;
    return false;
  });
  let total = 0, guzi = 0, game = 0, count = 0;
  list.forEach(e => {
    total += Number(e.totalAmount) || 0;
    count++;
    if (e.type === 'guzi') guzi += Number(e.totalAmount) || 0;
    if (e.type === 'game') game += Number(e.totalAmount) || 0;
  });
  return { total, guzi, game, count, records: list };
}

// 消费方式（PRD 4.5.13 — 游戏详情中下钻）
function payReasons(expenses, range) {
  const list = _filter(expenses, range.start, range.end);
  const map = {};
  list.forEach(e => {
    if (e.type !== 'game') return;
    const key = e.gameReason || '未填写';
    if (!map[key]) map[key] = { name: key, total: 0, count: 0 };
    map[key].total += Number(e.totalAmount) || 0;
    map[key].count++;
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
}

// 商品类型
function productTypes(expenses, range) {
  const list = _filter(expenses, range.start, range.end);
  const map = {};
  list.forEach(e => {
    if (e.type !== 'guzi') return;
    const key = e.productType || '未填写';
    if (!map[key]) map[key] = { name: key, total: 0, count: 0 };
    map[key].total += Number(e.totalAmount) || 0;
    map[key].count++;
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
}

// 购买渠道
function channels(expenses, range) {
  const list = _filter(expenses, range.start, range.end);
  const map = {};
  list.forEach(e => {
    if (e.type !== 'guzi') return;
    const key = e.channel || '未填写';
    if (!map[key]) map[key] = { name: key, total: 0, count: 0 };
    map[key].total += Number(e.totalAmount) || 0;
    map[key].count++;
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
}

// 角色（仅 IP 内 — PRD 4.5.13 / 决策154）
function roles(expenses, range, ipName) {
  const list = _filter(expenses, range.start, range.end).filter(e => {
    if (ipName) {
      if (e.type === 'guzi') return (e.ip || '').trim() === ipName;
      if (e.type === 'game') return (e.gameName || '').trim() === ipName;
      return false;
    }
    return false;
  });
  const map = {};
  list.forEach(e => {
    const roles = e.roles || (e.role ? [e.role] : []);
    const amount = Number(e.totalAmount) || 0;
    if (roles.length === 0) {
      if (!map['未填写角色']) map['未填写角色'] = { name: '未填写角色', total: 0, count: 0 };
      map['未填写角色'].total += amount;
      map['未填写角色'].count++;
    } else {
      roles.forEach(r => {
        if (!map[r]) map[r] = { name: r, total: 0, count: 0 };
        map[r].total += amount;
        map[r].count++;
      });
    }
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
}

// === 首页：消费趋势（实际消费，每日） + 本月/上月对比 ===
function homeMonthlyTrend(expenses) {
  const cur = currentMonthRange();
  const curList = _filter(expenses, cur.start, cur.end);
  const dayMap = {};
  const startDay = new Date(cur.start);
  const endDay = new Date(cur.end);
  for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
    const key = d.getDate();
    dayMap[key] = 0;
  }
  curList.forEach(e => {
    const d = new Date(e.date || e.createdAt);
    if (d.getFullYear() === new Date(cur.start).getFullYear() && d.getMonth() === new Date(cur.start).getMonth()) {
      dayMap[d.getDate()] = (dayMap[d.getDate()] || 0) + (Number(e.totalAmount) || 0);
    }
  });
  const series = Object.keys(dayMap).map(k => ({ day: Number(k), value: dayMap[k] }));

  // 上月
  const prev = monthRange(new Date(cur.start).getFullYear(), new Date(cur.start).getMonth() - 1);
  const prevList = _filter(expenses, prev.start, prev.end);
  const prevTotal = prevList.reduce((s, e) => s + (Number(e.totalAmount) || 0), 0);
  const curTotal = curList.reduce((s, e) => s + (Number(e.totalAmount) || 0), 0);

  return { series: { day: series }, curTotal, prevTotal };
}

// === 首页：最近消费（PRD 4.1.5 — 固定 3 条）===
function recentExpenses(expenses, n) {
  return expenses
    .filter(e => (e.totalAmount || 0) > 0)
    .sort((a, b) => (b.date || b.createdAt || 0) - (a.date || a.createdAt || 0))
    .slice(0, n || C.RECENT_DISPLAY);
}

// === 首页：待收到数量（PRD 4.1.4）===
function pendingPresaleCount(presales) {
  return presales.filter(p => p.status === C.PRESALE_STATUS.PENDING).length;
}

// === 消费列表（按月份汇总 — PRD 4.2.12）===
function expenseByMonth(expenses, year, month) {
  const range = monthRange(year, month);
  const list = _filter(expenses, range.start, range.end, null);
  let total = 0, guzi = 0, game = 0, count = 0;
  list.forEach(e => {
    total += Number(e.totalAmount) || 0;
    count++;
    if (e.type === 'guzi') guzi += Number(e.totalAmount) || 0;
    else if (e.type === 'game') game += Number(e.totalAmount) || 0;
  });
  return {
    total, guzi, game, count,
    records: list.sort((a, b) => (b.date || b.createdAt || 0) - (a.date || a.createdAt || 0))
  };
}

module.exports = {
  monthRange,
  currentMonthRange,
  weekRange,
  yearRange,
  decideGranularity,
  overview,
  trend,
  composition,
  ipStats,
  ipDetail,
  payReasons,
  productTypes,
  channels,
  roles,
  homeMonthlyTrend,
  recentExpenses,
  pendingPresaleCount,
  expenseByMonth
};
