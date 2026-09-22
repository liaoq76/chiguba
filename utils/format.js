// utils/format.js
function pad(n) { return n < 10 ? '0' + n : '' + n; }

function formatAmount(num) {
  const n = Number(num) || 0;
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(2);
}

function formatDate(ts, withTime) {
  const d = new Date(Number(ts));
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  if (withTime) {
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${y}-${m}-${day} ${hh}:${mm}`;
  }
  return `${y}-${m}-${day}`;
}

function getMonth(ts) {
  const d = new Date(Number(ts));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function getYear(ts) {
  return new Date(Number(ts)).getFullYear();
}

function getDayKey(ts) {
  const d = new Date(Number(ts));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function groupByDay(records) {
  const map = {};
  records.forEach(r => {
    const key = getDayKey(r.createdAt);
    if (!map[key]) map[key] = [];
    map[key].push(r);
  });
  return map;
}

function groupByCategory(records) {
  const map = {};
  records.forEach(r => {
    const k = r.categoryId || 'other';
    if (!map[k]) map[k] = 0;
    map[k] += Number(r.amount) || 0;
  });
  return map;
}

function groupByMonth(records) {
  const map = {};
  records.forEach(r => {
    const k = getMonth(r.createdAt);
    if (!map[k]) map[k] = 0;
    map[k] += Number(r.amount) || 0;
  });
  return map;
}

function sum(records) {
  return records.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
}

module.exports = {
  formatAmount,
  formatDate,
  getMonth,
  getYear,
  getDayKey,
  groupByDay,
  groupByCategory,
  groupByMonth,
  sum
};