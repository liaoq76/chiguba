// utils/stats.js
// 统计聚合：按周期、按分类
const Format = require('./format.js');

function summarizeByRange(records, startTs, endTs) {
  const filtered = records.filter(r => {
    const t = Number(r.createdAt);
    return t >= startTs && t <= endTs;
  });
  const total = Format.sum(filtered);
  const byCategory = Format.groupByCategory(filtered);
  const byDay = Format.groupByDay(filtered);
  return {
    records: filtered,
    total,
    count: filtered.length,
    byCategory,
    byDay
  };
}

function monthRange(year, monthIndex) {
  const start = new Date(year, monthIndex, 1).getTime();
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999).getTime();
  return { start, end };
}

function currentMonthRange() {
  const d = new Date();
  return monthRange(d.getFullYear(), d.getMonth());
}

function topCategories(byCategory, categories, n) {
  const list = Object.keys(byCategory).map(id => {
    const cat = categories.find(c => c.id === id) || { id, name: '未分类', color: '#bbb' };
    return {
      id,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      amount: byCategory[id]
    };
  });
  list.sort((a, b) => b.amount - a.amount);
  return list.slice(0, n || list.length);
}

module.exports = {
  summarizeByRange,
  monthRange,
  currentMonthRange,
  topCategories
};