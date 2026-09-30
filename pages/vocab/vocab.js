// pages/vocab/vocab.js — 个人词库（PRD 4.7）
const Storage = require('../../utils/storage.js');
const Vocab = require('../../utils/vocab.js');
const C = require('../../utils/constants.js');

Page({
  data: {
    typeLabels: {
      [C.VOCAB_TYPE.IP]: 'IP',
      [C.VOCAB_TYPE.GAME]: '游戏',
      [C.VOCAB_TYPE.ROLE]: '角色',
      [C.VOCAB_TYPE.PRODUCT_TYPE]: '商品类型',
      [C.VOCAB_TYPE.CHANNEL]: '购买渠道'
    },
    activeType: C.VOCAB_TYPE.IP,
    items: []
  },

  onShow() { this.refresh(); },

  refresh() {
    const items = Vocab.getByType(this.data.activeType);
    this.setData({ items });
  },

  switchType(e) {
    this.setData({ activeType: e.currentTarget.dataset.t });
    this.refresh();
  },

  rename(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    wx.showModal({
      title: '修改名称',
      content: '注意：修改后会同步更新所有历史业务数据。',
      editable: true,
      placeholderText: '新名称',
      content: name,
      success: r => {
        if (r.confirm && r.content.trim()) {
          Vocab.rename(id, r.content.trim());
          this.refresh();
          wx.showToast({ title: '已修改', icon: 'success' });
        }
      }
    });
  },

  remove(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    wx.showModal({
      title: '删除词条？',
      content: `确认删除"${name}"？\n历史业务数据不会受影响。`,
      confirmText: '删除',
      confirmColor: '#8b2a24',
      success: r => {
        if (r.confirm) {
          Vocab.remove(id);
          this.refresh();
        }
      }
    });
  },

  clearAll() {
    wx.showModal({
      title: '清空词库？',
      content: '将删除所有词条，但不会影响历史业务数据。',
      confirmText: '清空',
      confirmColor: '#8b2a24',
      success: r => {
        if (r.confirm) {
          Vocab.clearAll();
          // 重建默认值
          Vocab.ensureDefaults();
          this.refresh();
        }
      }
    });
  }
});
