// pages/add/add.js
const Storage = require('../../utils/storage.js');
const Format = require('../../utils/format.js');

Page({
  data: {
    categories: [],
    activeCategoryId: 'figure',
    amount: '',
    title: '',
    note: '',
    dateText: '',
    dateTs: 0,
    images: [],
    showCategoryModal: false
  },

  onShow() {
    const categories = Storage.getCategories();
    this.setData({ categories });
    if (!this.data.dateTs) {
      this.setData({
        dateTs: Date.now(),
        dateText: Format.formatDate(Date.now(), false)
      });
    }
  },

  chooseCategory(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeCategoryId: id });
  },

  onAmountInput(e) {
    const v = e.detail.value;
    this.setData({ amount: v });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },

  pickDate() {
    const cur = new Date(this.data.dateTs || Date.now());
    wx.showActionSheet({
      itemList: ['今天', '昨天', '前天', '一周前', '自定义日期'],
      success: (res) => {
        const now = new Date();
        let ts = now.getTime();
        if (res.tapIndex === 1) ts -= 24 * 60 * 60 * 1000;
        else if (res.tapIndex === 2) ts -= 2 * 24 * 60 * 60 * 1000;
        else if (res.tapIndex === 3) ts -= 7 * 24 * 60 * 60 * 1000;
        else if (res.tapIndex === 4) {
          wx.showLoading({ title: '请选择日期' });
          // 触发原生 picker
          this.openNativeDatePicker();
          return;
        }
        this.setData({ dateTs: ts, dateText: Format.formatDate(ts, false) });
      }
    });
  },

  openNativeDatePicker() {
    // 小程序没有原生 date picker API，用 wx.showActionSheet 替代选择常用日期，
    // 更精细的日期可升级为 picker-view 组件。
    wx.hideLoading();
    const items = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      items.push(Format.formatDate(d.getTime(), false));
    }
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const ts = now.getTime() - res.tapIndex * 24 * 60 * 60 * 1000;
        this.setData({ dateTs: ts, dateText: Format.formatDate(ts, false) });
      }
    });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 3 - this.data.images.length,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = res.tempFiles || [];
        const list = this.data.images.concat(files.map(f => f.tempFilePath));
        this.setData({ images: list.slice(0, 3) });
      }
    });
  },

  removeImage(e) {
    const idx = e.currentTarget.dataset.index;
    const list = this.data.images.slice();
    list.splice(idx, 1);
    this.setData({ images: list });
  },

  save() {
    const amount = Number(this.data.amount);
    if (!amount || amount <= 0) {
      wx.showToast({ title: '请输入金额', icon: 'none' });
      return;
    }
    if (!this.data.activeCategoryId) {
      wx.showToast({ title: '请选择分类', icon: 'none' });
      return;
    }
    const record = {
      title: this.data.title.trim() || '未命名',
      amount,
      categoryId: this.data.activeCategoryId,
      note: this.data.note.trim(),
      images: this.data.images.slice(),
      createdAt: this.data.dateTs || Date.now()
    };
    Storage.addRecord(record);
    wx.showToast({ title: '已记账', icon: 'success' });
    // 重置表单
    setTimeout(() => {
      this.setData({
        amount: '',
        title: '',
        note: '',
        images: []
      });
      wx.switchTab({ url: '/pages/records/records' });
    }, 600);
  },

  openCategoryManager() {
    wx.navigateTo({ url: '/pages/mine/mine?tab=categories' });
  }
});