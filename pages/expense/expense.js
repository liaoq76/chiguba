// pages/expense/expense.js — 消费列表（PRD 4.2.12 / 4.2.13）
const Storage = require('../../utils/storage.js');
const Stats = require('../../utils/stats.js');
const Format = require('../../utils/format.js');
const C = require('../../utils/constants.js');

Page({
  data: {
    // 当前月份
    year: new Date().getFullYear(),
    month: new Date().getMonth(), // 0-11
    monthLabel: '',

    // picker 数据
    yearOptions: [],      // ['2026', '2025', ...] 倒序字符串
    monthOptions: [],     // ['1月','2月',...]
    pickerColumns: [[], []], // 二维数组给 multiSelector
    pickerValue: [0, 0],  // 当前在两列中的下标

    // 月份汇总
    monthTotal: '¥0',
    monthGuZi: '¥0',
    monthGame: '¥0',
    monthCount: 0,

    // 类型 tab：all / guzi / game
    activeType: 'all',

    // 列表
    records: []
  },

  onLoad() {
    const now = new Date();
    const yearOptions = this._buildYearOptions(now.getFullYear());
    const monthOptions = this._buildMonthOptions();
    const { pickerValue } = this._calcPickerValue(
      yearOptions, monthOptions, now.getFullYear(), now.getMonth()
    );
    this.setData({
      year: now.getFullYear(),
      month: now.getMonth(),
      monthLabel: this._pureMonthLabel(now.getMonth()),
      yearOptions,
      monthOptions,
      pickerColumns: [yearOptions, monthOptions],
      pickerValue,
      isCurrentMonth: true
    });
  },

  /** 纯月份标签：9月（不带年份） */
  _pureMonthLabel(monthIdx) {
    return (monthIdx >= 0 && monthIdx < 12) ? `${monthIdx + 1}月` : '';
  },

  /** 年份倒序：最新年份在前，全部转字符串以适配 picker */
  _buildYearOptions(currentYear) {
    const minYear = 2000;
    const years = [];
    for (let y = minYear; y <= currentYear; y++) years.push(y);
    return years.reverse().map(String);
  },

  /** 月份：1月 ~ 12月 */
  _buildMonthOptions() {
    return ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  },

  /** 根据当前选中年月，计算 picker 在双列中的下标 */
  _calcPickerValue(yearOptions, monthOptions, year, month) {
    const yIdx = yearOptions.indexOf(String(year));
    const mIdx = month >= 0 && month < 12 ? month : 0;
    return {
      pickerValue: [yIdx >= 0 ? yIdx : 0, mIdx]
    };
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const d = this.data;
    const summary = Stats.expenseByMonth(Storage.getExpenses(), d.year, d.month);
    let records = summary.records;
    if (d.activeType !== 'all') {
      records = records.filter(r => r.type === d.activeType);
    }
    const now = new Date();
    const isCurrentMonth = d.year === now.getFullYear() && d.month === now.getMonth();
    this.setData({
      monthTotal: Format.formatAmount(summary.total),
      monthGuZi: Format.formatAmount(summary.guzi),
      monthGame: Format.formatAmount(summary.game),
      monthCount: summary.count,
      isCurrentMonth,
      records: records.map(r => ({
        _id: r._id,
        name: r.productName || r.gameName || '未命名',
        sub: r.type === 'guzi' ? (r.ip || '未填IP') : (r.gameReason || ''),
        amount: Format.formatAmount(r.totalAmount),
        icon: r.type === 'guzi' ? '◉' : '◆',
        dateLabel: Format.formatDate(new Date(r.date || r.createdAt))
      }))
    });
  },

  pickType(e) {
    this.setData({ activeType: e.currentTarget.dataset.t });
    this.refresh();
  },

  prevMonth() {
    let { year, month } = this.data;
    month--;
    if (month < 0) { month = 11; year--; }
    this._setYearMonth(year, month);
  },

  nextMonth() {
    const now = new Date();
    let { year, month } = this.data;
    if (year > now.getFullYear()) return;
    if (year === now.getFullYear() && month >= now.getMonth()) return;
    month++;
    if (month > 11) { month = 0; year++; }
    this._setYearMonth(year, month);
  },

  /** 设置年份月份并刷新 */
  _setYearMonth(year, month) {
    const yIdx = this.data.yearOptions.indexOf(String(year));
    this.setData({
      year,
      month,
      monthLabel: this._pureMonthLabel(month),
      pickerValue: [yIdx >= 0 ? yIdx : 0, month]
    });
    this.refresh();
  },

  /** 用户滑动某一列时触发（不提交） */
  onMonthPickerColumnChange(e) {
    const col = e.detail.column;
    const idx = e.detail.value;
    if (col === 0) {
      // 切换了年：更新 pickerValue 的年下标
      this.setData({ 'pickerValue[0]': idx });
    } else if (col === 1) {
      this.setData({ 'pickerValue[1]': idx });
    }
  },

  /** 用户点击确定：picker 提交 */
  onMonthPickerChange(e) {
    const [yIdx, mIdx] = e.detail.value;
    const year = Number(this.data.yearOptions[yIdx]);
    const month = mIdx;
    if (!year || month == null) return;

    // 限制不能超过当前月
    const now = new Date();
    if (year > now.getFullYear()) return;
    if (year === now.getFullYear() && month > now.getMonth()) return;

    this._setYearMonth(year, month);
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/expense/detail?id=' + id });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.refresh();
    wx.stopPullDownRefresh();
  }
});
