// pages/add/add.js — ＋记一笔（PRD 4.2.3 / 4.2.4-4.2.10）
const Storage = require('../../utils/storage.js');
const Expense = require('../../utils/expense.js');
const Vocab = require('../../utils/vocab.js');
const Format = require('../../utils/format.js');
const Image = require('../../utils/image.js');
const C = require('../../utils/constants.js');

Page({
  data: {
    step: 'type',                  // type / form
    expenseType: '',               // guzi / game

    // === 通用字段 ===
    name: '',
    quantity: 1,
    unitPrice: '',
    totalAmount: '',
    date: Date.now(),
    dateLabel: '',
    note: '',

    // === 谷子字段 ===
    ip: '',
    role: '',
    roles: [],
    productType: '',
    channel: '',
    source: '',                    // official / fanmade

    // === 游戏字段 ===
    gameName: '',
    gameReason: '',
    gameReasonOptions: ['抽卡', '直购', '赠送', '月卡', '礼包'],
    amount: '',

    // === 更多信息折叠 ===
    showMore: false,

    // === 收藏 ===
    addToCollection: false,

    // === 预售 ===
    isPresale: false,
    expectedShip: '',
    presaleQty: 1,

    // === 商品图片（PRD 4.2.4 — MVP 单张）===
    pickedImage: null,             // { localPath, cloudPath?, status }

    // === 输入助手 ===
    ipSuggestions: [],
    roleSuggestions: [],
    typeSuggestions: [],
    channelSuggestions: [],
    gameSuggestions: [],
    activeField: null,

    // === 内部 ===
    editId: null
  },

  onLoad(options) {
    const dateLabel = Format.formatDate(new Date());
    this.setData({ dateLabel });

    const editId = options.edit || (getApp().globalData.pendingEditExpenseId);
    if (editId) {
      getApp().globalData.pendingEditExpenseId = '';
      this._loadEdit(editId);
    }
  },

  _loadEdit(id) {
    const list = Storage.getExpenses();
    const e = list.find(x => x._id === id);
    if (!e) return;
    const existingImg = (e.images && e.images.length) ? e.images[0] : null;
    this.setData({
      editId: id,
      step: 'form',
      expenseType: e.type,
      name: e.productName || '',
      quantity: e.quantity || 1,
      unitPrice: e.unitPrice || '',
      totalAmount: e.totalAmount || '',
      date: e.date,
      dateLabel: Format.formatDate(new Date(e.date)),
      note: e.note || '',
      ip: e.ip || '',
      role: e.role || '',
      roles: e.roles || [],
      productType: e.productType || '',
      channel: e.channel || '',
      source: e.source || '',
      gameName: e.gameName || '',
      gameReason: e.gameReason || '',
      amount: e.amount || '',
      addToCollection: !!e.addToCollection,
      isPresale: !!e.isPresale,
      expectedShip: e.expectedShip ? Format.formatDate(new Date(e.expectedShip)) : '',
      presaleQty: e.presaleQty || e.quantity || 1,
      pickedImage: existingImg
    });
  },

  // === 类型选择 ===
  pickType(e) {
    const t = e.currentTarget.dataset.type;
    this.setData({
      expenseType: t,
      step: 'form',
      // 重置游戏字段
      gameName: this.data.gameName,
      gameReason: t === C.EXPENSE_TYPE.GAME && !this.data.gameReason ? '抽卡' : this.data.gameReason
    });
  },

  backType() {
    this.setData({ step: 'type', editId: null });
  },

  // === 谷子字段 ===
  onName(e) { this.setData({ name: e.detail.value }); },
  onIp(e) {
    const v = e.detail.value;
    this.setData({ ip: v });
    this._updateSuggestions('ip', v);
  },
  onIpFocus() { this._updateSuggestions('ip', this.data.ip); this.setData({ activeField: 'ip' }); },
  onRole(e) {
    const v = e.detail.value;
    this.setData({ role: v });
    this._updateSuggestions('role', v);
  },
  onRoleFocus() { this._updateSuggestions('role', this.data.role); this.setData({ activeField: 'role' }); },
  onProductType(e) {
    const v = e.detail.value;
    this.setData({ productType: v });
    this._updateSuggestions('productType', v);
  },
  onProductTypeFocus() { this._updateSuggestions('productType', this.data.productType); this.setData({ activeField: 'productType' }); },
  onChannel(e) {
    const v = e.detail.value;
    this.setData({ channel: v });
    this._updateSuggestions('channel', v);
  },
  onChannelFocus() { this._updateSuggestions('channel', this.data.channel); this.setData({ activeField: 'channel' }); },

  pickSource(e) { this.setData({ source: e.currentTarget.dataset.s }); },
  pickSuggestion(e) {
    const f = e.currentTarget.dataset.field;
    const v = e.currentTarget.dataset.value;
    this.setData({ [f]: v, activeField: null });
  },

  // === 游戏字段 ===
  onGameName(e) {
    const v = e.detail.value;
    this.setData({ gameName: v });
    this._updateSuggestions('game', v);
  },
  onGameNameFocus() { this._updateSuggestions('game', this.data.gameName); this.setData({ activeField: 'gameName' }); },
  pickGameReason(e) { this.setData({ gameReason: e.currentTarget.dataset.r }); },

  // === 通用 ===
  onUnitPrice(e) {
    const v = e.detail.value;
    this.setData({ unitPrice: v, totalAmount: this._calcTotal() });
  },
  onQuantity(e) {
    const v = e.detail.value;
    this.setData({ quantity: Number(v) || 1, totalAmount: this._calcTotal() });
  },
  onTotalAmount(e) {
    this.setData({ totalAmount: e.detail.value });
  },
  onAmount(e) { this.setData({ amount: e.detail.value }); },
  onNote(e) { this.setData({ note: e.detail.value }); },

  onQuantityStep(e) {
    const op = e.currentTarget.dataset.op;
    let q = (this.data.quantity || 1) + op;
    if (q < 1) q = 1;
    this.setData({ quantity: q, totalAmount: this._calcTotal() });
  },

  _calcTotal() {
    const u = Number(this.data.unitPrice) || 0;
    const q = Number(this.data.quantity) || 0;
    return Math.round(u * q * 100) / 100;
  },

  // === 日期 ===
  onPickDate() {
    const today = new Date();
    const max = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    wx.showActionSheet({
      itemList: ['今天', '昨天', '前天', '一周前'],
      success: res => {
        let d = new Date();
        if (res.tapIndex === 1) d.setDate(d.getDate() - 1);
        else if (res.tapIndex === 2) d.setDate(d.getDate() - 2);
        else if (res.tapIndex === 3) d.setDate(d.getDate() - 7);
        this.setData({
          date: d.getTime(),
          dateLabel: Format.formatDate(d)
        });
      }
    });
  },

  // === 更多信息 ===
  toggleMore() { this.setData({ showMore: !this.data.showMore }); },

  // === 图片选择 / 删除（PRD 4.2.4 — MVP 单张）===
  async onPickImage() {
    try {
      const img = await Image.pickImage();
      this.setData({ pickedImage: img });
    } catch (e) {
      // 用户取消不报错
      if (e && e.errMsg && /cancel/i.test(e.errMsg)) return;
      console.warn('[add] pick image failed:', e);
      wx.showToast({ title: '选图失败', icon: 'none' });
    }
  },

  onRemoveImage() {
    const img = this.data.pickedImage;
    if (img && img.status === 'uploaded' && img.cloudPath) {
      // 已上传的图，清理云端
      Image.deleteCloudImages({ images: [img] });
    }
    this.setData({ pickedImage: null });
  },

  onPreviewImage() {
    const img = this.data.pickedImage;
    if (img) Image.preview([img], img);
  },

  toggleCollection(e) {
    this.setData({ addToCollection: e.detail.value });
  },
  togglePresale(e) {
    const checked = e.detail.value;
    const patch = { isPresale: checked };
    if (checked && !this.data.expectedShip) {
      // 默认预计出荷：30 天后
      const d = new Date();
      d.setDate(d.getDate() + 30);
      patch.expectedShip = Format.formatDate(d);
    }
    this.setData(patch);
  },
  onExpectedShip() {
    // 简单处理：用 picker 选择器
    wx.showActionSheet({
      itemList: ['一周后', '一个月后', '三个月后', '半年后'],
      success: res => {
        const d = new Date();
        if (res.tapIndex === 0) d.setDate(d.getDate() + 7);
        else if (res.tapIndex === 1) d.setDate(d.getDate() + 30);
        else if (res.tapIndex === 2) d.setDate(d.getDate() + 90);
        else if (res.tapIndex === 3) d.setDate(d.getDate() + 180);
        this.setData({
          expectedShip: Format.formatDate(d),
          isPresale: true
        });
      }
    });
  },

  // === 提交 ===
  save() {
    const d = this.data;
    if (d.expenseType === C.EXPENSE_TYPE.GUZI) {
      if (!d.name.trim()) return wx.showToast({ title: '请填写商品名称', icon: 'none' });
      if (!d.unitPrice) return wx.showToast({ title: '请填写单价', icon: 'none' });
      if (!d.ip.trim()) return wx.showToast({ title: '请填写 IP', icon: 'none' });

      const payload = {
        type: 'guzi',
        productName: d.name.trim(),
        unitPrice: Number(d.unitPrice),
        quantity: Number(d.quantity) || 1,
        ip: d.ip.trim(),
        role: d.role.trim(),
        roles: d.roles,
        productType: d.productType.trim(),
        channel: d.channel.trim(),
        source: d.source,
        addToCollection: d.addToCollection,
        isPresale: d.isPresale,
        date: d.date,
        note: d.note,
        images: d.pickedImage ? [d.pickedImage] : [],
        totalAmount: d.totalAmount || d._calcTotal ? this._calcTotal() : 0
      };
      if (d.isPresale) {
        payload.presaleQty = Number(d.presaleQty) || payload.quantity;
        payload.expectedShip = d.expectedShip ? new Date(d.expectedShip).getTime() : null;
      }

      if (d.editId) {
        Expense.update(d.editId, payload, { syncCollection: false });
      } else {
        Expense.create(payload);
      }
    } else {
      // 游戏
      if (!d.gameName.trim()) return wx.showToast({ title: '请填写游戏名称', icon: 'none' });
      if (!d.gameReason) return wx.showToast({ title: '请选择氪金原因', icon: 'none' });

      const payload = {
        type: 'game',
        gameName: d.gameName.trim(),
        gameReason: d.gameReason,
        date: d.date,
        note: d.note
      };
      if (d.gameReason === '月卡' || d.gameReason === '礼包') {
        if (!d.unitPrice) return wx.showToast({ title: '请填写单价', icon: 'none' });
        payload.unitPrice = Number(d.unitPrice);
        payload.quantity = Number(d.quantity) || 1;
        payload.totalAmount = this._calcTotal();
      } else {
        if (!d.amount) return wx.showToast({ title: '请填写金额', icon: 'none' });
        payload.amount = Number(d.amount);
        payload.totalAmount = Number(d.amount);
      }

      if (d.editId) {
        Expense.update(d.editId, payload, { syncCollection: false });
      } else {
        Expense.create(payload);
      }
    }

    wx.showToast({ title: '已记录', icon: 'success' });
    setTimeout(() => {
      wx.switchTab({ url: d.editId ? '/pages/expense/expense' : '/pages/index/index' });
    }, 600);
  },

  _updateSuggestions(field, input) {
    let list = [];
    if (field === 'ip') list = Vocab.getByType(C.VOCAB_TYPE.IP).map(v => v.name);
    else if (field === 'role') list = Vocab.getByType(C.VOCAB_TYPE.ROLE).map(v => v.name);
    else if (field === 'productType') list = Vocab.getByType(C.VOCAB_TYPE.PRODUCT_TYPE).map(v => v.name);
    else if (field === 'channel') list = Vocab.getByType(C.VOCAB_TYPE.CHANNEL).map(v => v.name);
    else if (field === 'game') list = Vocab.getByType(C.VOCAB_TYPE.GAME).map(v => v.name);

    const key = field === 'game' ? 'gameSuggestions' :
                field === 'ip' ? 'ipSuggestions' :
                field === 'role' ? 'roleSuggestions' :
                field === 'productType' ? 'typeSuggestions' :
                'channelSuggestions';
    if (input && input.trim()) {
      const kw = input.trim().toLowerCase();
      list = list.filter(n => n.toLowerCase().includes(kw));
    }
    this.setData({ [key]: list.slice(0, 6) });
  }
});
