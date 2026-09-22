// pages/mine/mine.js
const Storage = require('../../utils/storage.js');
const Format = require('../../utils/format.js');
const DEFAULT = Storage.DEFAULT_CATEGORIES;

Page({
  data: {
    profile: { nickname: '吃谷人', avatar: '' },
    records: [],
    total: '0',
    monthTotal: '0',
    recordCount: 0,
    budget: 0,
    categories: [],
    activeTab: 'profile', // profile | budget | categories | about
    showAddCat: false,
    newCat: { name: '', icon: '📦', color: '#ff6f9d' },
    iconOptions: ['🎮', '🌸', '✨', '🧸', '🎖️', '🃏', '📖', '👗', '🎤', '🛍️', '📦', '🎨', '🪄', '🧁', '🎀', '🧿', '🔮'],
    colorOptions: ['#ff6f9d', '#7fbcff', '#ffb84d', '#b07cff', '#5fd1c0', '#ff8a78', '#8aa1ff', '#ff6fb1', '#f7a35c', '#a0d995']
  },

  onLoad(query) {
    if (query && query.tab) this.setData({ activeTab: query.tab });
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const records = Storage.getRecords();
    const monthRecords = records.filter(r => Format.getMonth(r.createdAt) === Format.getMonth(Date.now()));
    this.setData({
      profile: Storage.getProfile(),
      records,
      total: Format.formatAmount(Format.sum(records)),
      monthTotal: Format.formatAmount(Format.sum(monthRecords)),
      recordCount: records.length,
      budget: Storage.getBudget(),
      categories: Storage.getCategories()
    });
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  editNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入昵称',
      content: this.data.profile.nickname,
      success: (r) => {
        if (r.confirm && r.content) {
          const p = this.data.profile;
          p.nickname = r.content.slice(0, 12);
          Storage.setProfile(p);
          this.setData({ profile: p });
        }
      }
    });
  },

  saveBudget(e) {
    const v = Number(e.detail.value);
    Storage.setBudget(v > 0 ? v : 0);
    this.setData({ budget: Storage.getBudget() });
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  showAddCatModal() {
    this.setData({ showAddCat: true, newCat: { name: '', icon: '📦', color: '#ff6f9d' } });
  },

  hideAddCatModal() {
    this.setData({ showAddCat: false });
  },

  stopPropagation() {},

  pickIcon(e) {
    const ic = e.currentTarget.dataset.icon;
    this.setData({ 'newCat.icon': ic });
  },

  pickColor(e) {
    const c = e.currentTarget.dataset.color;
    this.setData({ 'newCat.color': c });
  },

  onCatNameInput(e) {
    this.setData({ 'newCat.name': e.detail.value });
  },

  confirmAddCat() {
    const name = this.data.newCat.name.trim();
    if (!name) {
      wx.showToast({ title: '请输入名称', icon: 'none' });
      return;
    }
    const id = 'c_' + Date.now();
    const list = this.data.categories.concat([{
      id, name,
      icon: this.data.newCat.icon,
      color: this.data.newCat.color
    }]);
    Storage.setCategories(list);
    this.setData({ categories: list, showAddCat: false });
  },

  removeCat(e) {
    const id = e.currentTarget.dataset.id;
    if (DEFAULT.find(c => c.id === id)) {
      wx.showToast({ title: '默认分类不可删除', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '删除分类',
      content: '确定要删除这个自定义分类吗？',
      success: (r) => {
        if (r.confirm) {
          const list = this.data.categories.filter(c => c.id !== id);
          Storage.setCategories(list);
          this.setData({ categories: list });
        }
      }
    });
  },

  resetCategories() {
    wx.showModal({
      title: '恢复默认分类',
      content: '将清除自定义分类，确定吗？',
      success: (r) => {
        if (r.confirm) {
          Storage.setCategories(DEFAULT);
          this.setData({ categories: DEFAULT });
        }
      }
    });
  },

  exportData() {
    const data = {
      profile: this.data.profile,
      budget: this.data.budget,
      categories: this.data.categories,
      records: this.data.records,
      exportedAt: Date.now()
    };
    wx.setStorageSync('chigu_export_' + Date.now(), data);
    wx.showModal({
      title: '数据已导出',
      content: '导出数据已保存到本地缓存（key 前缀 chigu_export_）。后续可对接云函数上传。',
      showCancel: false
    });
  },

  clearAll() {
    wx.showModal({
      title: '清空全部记录',
      content: '此操作会删除所有账目，且无法恢复，确定继续吗？',
      confirmColor: '#ff4d4f',
      success: (r) => {
        if (r.confirm) {
          Storage.setRecords([]);
          this.refresh();
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  }
});