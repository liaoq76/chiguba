// utils/format.js — 金额/日期/数字格式化

// 金额：千分位 + ¥ + 两位小数
function formatAmount(n) {
  if (n === null || n === undefined || isNaN(n)) return '¥0.00';
  const num = Number(n);
  // ¥0 显示 ¥0 而非 ¥0.00（仍保留视觉一致）
  if (num === 0) return '¥0';
  // 整数不显示小数
  if (Number.isInteger(num)) {
    return '¥' + num.toLocaleString('zh-CN');
  }
  return '¥' + num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 短金额（用于紧凑区域）：千元以上用 k
function formatAmountShort(n) {
  if (n === null || n === undefined || isNaN(n)) return '0';
  const num = Number(n);
  if (num === 0) return '0';
  if (Math.abs(num) >= 10000) return (num / 10000).toFixed(1) + 'w';
  if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toFixed(0);
}

// 日期：YYYY/MM/DD
function formatDate(input, withTime = false) {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  if (!withTime) return `${y}/${m}/${day}`;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

// 月份显示：YYYY年M月
function formatMonth(input) {
  const d = input instanceof Date ? input : new Date(input);
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

// 相对时间（用于最近消费）
function formatRelative(input) {
  const d = input instanceof Date ? input : new Date(input);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  if (diff < 7 * 86400) return Math.floor(diff / 86400) + '天前';
  return formatDate(d);
}

// 数字：保留两位小数（用于占比）
function formatPercent(n) {
  if (n === null || n === undefined || isNaN(n)) return '0%';
  return (Number(n) * 100).toFixed(1) + '%';
}

// 输入校验：金额字符串 → 数字（保留两位小数）
function parseAmount(str) {
  if (str === '' || str === null || str === undefined) return 0;
  const n = Number(str);
  if (isNaN(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

module.exports = {
  formatAmount,
  formatAmountShort,
  formatDate,
  formatMonth,
  formatRelative,
  formatPercent,
  parseAmount
};
