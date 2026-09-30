// utils/ui.js — UI 常量（颜色 / 字号 / 间距）— 和风配色

const COLOR = {
  bg: '#f5efe6',
  bgCard: '#faf6ef',
  bgElev: '#ffffff',
  line: '#e8dfd2',
  lineSoft: '#f0e8da',
  text: '#2c2620',
  textSub: '#6b6055',
  textMute: '#9a8f80',
  primary: '#b6433a',
  primarySoft: '#f0d9d4',
  accent: '#3a6b6b',
  accentSoft: '#d6e3e3',
  gold: '#b08847',
  warn: '#c46a3a',
  danger: '#8b2a24',
  // 图表用色
  chartGuZi: '#b6433a',
  chartGame: '#3a6b6b',
  chartLine: '#b08847',
  chartGrid: '#e8dfd2'
};

// 和风图标（用 emoji 简化占位，避免依赖 iconfont）
const ICON = {
  home: '⌂',
  expense: '〰',
  add: '＋',
  collection: '♡',
  mine: '人',
  guzi: '◉',
  game: '◆',
  presale: '◫',
  search: '○',
  filter: '≡',
  calendar: '◷',
  trend: '⌒',
  warn: '!',
  ok: '✓',
  arrow: '›',
  ip: '★',
  budget: '⊕',
  vocab: '⌘',
  data: '⇋',
  feedback: '✎',
  about: 'ⓘ',
  copy: '⎘'
};

module.exports = { COLOR, ICON };
