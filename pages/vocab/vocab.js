// pages/vocab/vocab.js — 个人词库（紫色 Hero V2）
const CATEGORY_META = {
  ip: { label: 'IP', emoji: '📚', gradient: ['#A78BFA', '#7C3AED'] },
  game: { label: '游戏', emoji: '🎮', gradient: ['#60A5FA', '#3B82F6'] },
  role: { label: '角色', emoji: '🧑‍🎤', gradient: ['#F472B6', '#EC4899'] },
  productType: { label: '类型', emoji: '🏷', gradient: ['#34D399', '#10B981'] },
  channel: { label: '渠道', emoji: '🛒', gradient: ['#FBBF24', '#F59E0B'] }
};

// 模拟数据（每个分类 3-5 个词条）
const MOCK_DATA = {
  ip: [
    { _id: 'ip1', name: '原神' },
    { _id: 'ip2', name: '崩坏：星穹铁道' },
    { _id: 'ip3', name: '咒术回战' },
    { _id: 'ip4', name: '排球少年' },
    { _id: 'ip5', name: '间谍过家家' }
  ],
  game: [
    { _id: 'g1', name: '原神' },
    { _id: 'g2', name: '星穹铁道' },
    { _id: 'g3', name: '恋与深空' },
    { _id: 'g4', name: '未定事件簿' }
  ],
  role: [
    { _id: 'r1', name: '魈' },
    { _id: 'r2', name: '雷电将军' },
    { _id: 'r3', name: '五条悟' },
    { _id: 'r4', name: '伏黑惠' }
  ],
  productType: [
    { _id: 'pt1', name: '吧唧' },
    { _id: 'pt2', name: '亚克力立牌' },
    { _id: 'pt3', name: '色纸' },
    { _id: 'pt4', name: '明信片' },
    { _id: 'pt5', name: '徽章套装' }
  ],
  channel: [
    { _id: 'c1', name: '官方旗舰店' },
    { _id: 'c2', name: '漫展摊位' },
    { _id: 'c3', name: '闲鱼二手' },
    { _id: 'c4', name: '代购' }
  ]
};

Page({
  data: {
    categoryList: Object.keys(CATEGORY_META).map(k => ({
      key: k,
      label: CATEGORY_META[k].label,
      emoji: CATEGORY_META[k].emoji
    })),
    activeType: 'ip',
    items: MOCK_DATA.ip,
    categoryEmoji: '📚',
    categoryLabel: 'IP'
  },

  onLoad() {
    this._switchTo('ip');
  },

  switchType(e) {
    const t = e.currentTarget.dataset.t;
    if (t === this.data.activeType) return;
    this._switchTo(t);
  },

  _switchTo(t) {
    const meta = CATEGORY_META[t];
    this.setData({
      activeType: t,
      items: MOCK_DATA[t] || [],
      categoryEmoji: meta.emoji,
      categoryLabel: meta.label
    });
  },

  rename(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '修改词条',
      content: `重命名：${name}`,
      editable: true,
      success: (res) => {
        if (res.confirm && res.content && res.content !== name) {
          const list = this.data.items.map(it => it._id === id ? { ...it, name: res.content } : it);
          this.setData({ items: list });
          wx.showToast({ title: '已修改', icon: 'success' });
        }
      }
    });
  },

  remove(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除词条',
      content: `确定删除"${name}"吗？`,
      success: (res) => {
        if (res.confirm) {
          this.setData({ items: this.data.items.filter(it => it._id !== id) });
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  addWord() {
    wx.showModal({
      title: `新增${this.data.categoryLabel}词条`,
      editable: true,
      placeholderText: '请输入名称',
      success: (res) => {
        if (res.confirm && res.content) {
          const newItem = { _id: 'n' + Date.now(), name: res.content };
          this.setData({ items: [newItem, ...this.data.items] });
          wx.showToast({ title: '已添加', icon: 'success' });
        }
      }
    });
  },

  clearAll() {
    wx.showModal({
      title: '清空词库',
      content: '将清空所有分类的词条，且不可恢复。确认吗？',
      success: (res) => {
        if (res.confirm) {
          Object.keys(MOCK_DATA).forEach(k => { MOCK_DATA[k] = []; });
          this.setData({ items: [] });
          wx.showToast({ title: '已清空', icon: 'none' });
        }
      }
    });
  }
});
