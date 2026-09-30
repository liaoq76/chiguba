// pages/collection/collection.js — 收藏（PRD 4.3）
const Storage = require('../../utils/storage.js');
const C = require('../../utils/constants.js');

Page({
  data: {
    view: 'grid',            // grid / list
    filterOpen: false,
    filters: { ip: '', role: '', productType: '' },
    ipOptions: [],
    roleOptions: [],
    typeOptions: [],

    activeTab: 'current',    // current / history
    currentItems: [],
    historyItems: []
  },

  onLoad() {
    const view = Storage.getCollectionView() || 'grid';
    this.setData({ view });
    this._loadOptions();
  },

  onShow() {
    this.refresh();
  },

  _loadOptions() {
    const ip = Storage.getVocabs().filter(v => v.type === C.VOCAB_TYPE.IP).map(v => v.name);
    const role = Storage.getVocabs().filter(v => v.type === C.VOCAB_TYPE.ROLE).map(v => v.name);
    const type = Storage.getVocabs().filter(v => v.type === C.VOCAB_TYPE.PRODUCT_TYPE).map(v => v.name);
    this.setData({ ipOptions: ip, roleOptions: role, typeOptions: type });
  },

  refresh() {
    const f = this.data.filters;
    const all = Storage.getCollections();
    let cur = all.filter(c => c.currentQty > 0 && c.status !== 'history');
    let hist = all.filter(c => c.currentQty === 0 || c.status === 'history');

    if (f.ip) cur = cur.filter(c => c.ip === f.ip);
    if (f.role) cur = cur.filter(c => c.role === f.role);
    if (f.productType) cur = cur.filter(c => c.productType === f.productType);

    this.setData({
      currentItems: cur,
      historyItems: hist
    });
  },

  switchView() {
    const v = this.data.view === 'grid' ? 'list' : 'grid';
    Storage.setCollectionView(v);
    this.setData({ view: v });
  },

  openFilter() { this.setData({ filterOpen: true }); },
  closeFilter() { this.setData({ filterOpen: false }); },

  pickFilter(e) {
    const f = e.currentTarget.dataset.field;
    const v = e.currentTarget.dataset.value;
    const filters = Object.assign({}, this.data.filters, { [f]: this.data.filters[f] === v ? '' : v });
    this.setData({ filters });
  },

  resetFilter() { this.setData({ filters: { ip: '', role: '', productType: '' } }); },

  applyFilter() {
    this.closeFilter();
    this.refresh();
  },

  switchTab(e) { this.setData({ activeTab: e.currentTarget.dataset.t }); },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/collection/detail?id=' + id });
  },

  goHistory() { wx.navigateTo({ url: '/pages/collection/history' }); },
  goAdd() { wx.navigateTo({ url: '/pages/collection/edit' }); }
});
