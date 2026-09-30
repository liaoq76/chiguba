// pages/collection/edit.js — 独立添加收藏（PRD 4.3.2）
const Collection = require('../../utils/collection.js');
const Vocab = require('../../utils/vocab.js');
const Format = require('../../utils/format.js');
const C = require('../../utils/constants.js');

Page({
  data: {
    name: '',
    ip: '',
    role: '',
    productType: '',
    quantity: 1,
    startDate: Date.now(),
    startDateLabel: '',
    ipSuggestions: [],
    roleSuggestions: [],
    typeSuggestions: []
  },

  onLoad() {
    this.setData({ startDateLabel: Format.formatDate(new Date()) });
  },

  onName(e) { this.setData({ name: e.detail.value }); },
  onIp(e) { this.setData({ ip: e.detail.value }); this._filter('ip', e.detail.value); },
  onIpFocus() { this._filter('ip', this.data.ip); },
  onRole(e) { this.setData({ role: e.detail.value }); this._filter('role', e.detail.value); },
  onRoleFocus() { this._filter('role', this.data.role); },
  onType(e) { this.setData({ productType: e.detail.value }); this._filter('productType', e.detail.value); },
  onTypeFocus() { this._filter('productType', this.data.productType); },

  pickSuggestion(e) {
    const f = e.currentTarget.dataset.field;
    const v = e.currentTarget.dataset.value;
    this.setData({ [f]: v });
  },

  onQuantityStep(e) {
    let q = this.data.quantity + Number(e.currentTarget.dataset.op);
    if (q < 1) q = 1;
    this.setData({ quantity: q });
  },

  onPickDate() {
    wx.showActionSheet({
      itemList: ['今天', '一周前', '一个月前'],
      success: res => {
        const d = new Date();
        if (res.tapIndex === 1) d.setDate(d.getDate() - 7);
        else if (res.tapIndex === 2) d.setMonth(d.getMonth() - 1);
        this.setData({
          startDate: d.getTime(),
          startDateLabel: Format.formatDate(d)
        });
      }
    });
  },

  save() {
    if (!this.data.name.trim()) return wx.showToast({ title: '请填写商品名称', icon: 'none' });
    if (this.data.quantity < 1) return wx.showToast({ title: '数量至少为1', icon: 'none' });
    if (!this.data.ip.trim()) return wx.showToast({ title: '请填写 IP', icon: 'none' });

    Vocab.ensureName(C.VOCAB_TYPE.IP, this.data.ip);
    if (this.data.role) Vocab.ensureName(C.VOCAB_TYPE.ROLE, this.data.role);
    if (this.data.productType) Vocab.ensureName(C.VOCAB_TYPE.PRODUCT_TYPE, this.data.productType);

    Collection.create({
      name: this.data.name.trim(),
      ip: this.data.ip.trim(),
      role: this.data.role.trim(),
      productType: this.data.productType.trim(),
      currentQty: this.data.quantity,
      ownedQty: this.data.quantity,
      startDate: this.data.startDate
    });

    wx.showToast({ title: '已添加', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 600);
  },

  _filter(field, input) {
    let list = [];
    if (field === 'ip') list = Vocab.getByType(C.VOCAB_TYPE.IP).map(v => v.name);
    else if (field === 'role') list = Vocab.getByType(C.VOCAB_TYPE.ROLE).map(v => v.name);
    else if (field === 'productType') list = Vocab.getByType(C.VOCAB_TYPE.PRODUCT_TYPE).map(v => v.name);
    if (input) list = list.filter(n => n.toLowerCase().includes(input.toLowerCase()));
    const key = field === 'ip' ? 'ipSuggestions' : field === 'role' ? 'roleSuggestions' : 'typeSuggestions';
    this.setData({ [key]: list.slice(0, 6) });
  }
});
