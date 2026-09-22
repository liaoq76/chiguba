// pages/detail/detail.js
const Storage = require('../../utils/storage.js');
const Format = require('../../utils/format.js');

Page({
  data: {
    id: '',
    record: null,
    category: { name: '未分类', icon: '📦', color: '#bbb' },
    images: []
  },

  onLoad(query) {
    this.setData({ id: query.id });
    this.refresh();
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const list = Storage.getRecords();
    const r = list.find(x => x.id === this.data.id);
    if (!r) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 600);
      return;
    }
    const cat = Storage.getCategories().find(c => c.id === r.categoryId) || { name: '未分类', icon: '📦', color: '#bbb' };
    this.setData({
      record: Object.assign({}, r, { amount: Format.formatAmount(r.amount) }),
      category: cat,
      images: r.images || []
    });
  },

  preview(e) {
    const src = e.currentTarget.dataset.src;
    wx.previewImage({ urls: this.data.images, current: src });
  },

  remove() {
    wx.showModal({
      title: '删除记录',
      content: '确定要删除这条记录吗？',
      confirmColor: '#ff4d4f',
      success: (r) => {
        if (r.confirm) {
          Storage.removeRecord(this.data.id);
          wx.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 500);
        }
      }
    });
  }
});