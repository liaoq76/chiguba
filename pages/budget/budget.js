// pages/budget/budget.js — 预算管理（浅粉紫 Hero + 浅色 SVG 环形）
Page({
  data: {
    totalBudget: 2000,
    totalActual: 1280,
    totalPercent: 64,

    guziBudget: 800,
    guziActual: 520,
    guziPercent: 65,

    gameBudget: 600,
    gameActual: 480,
    gamePercent: 80,

    history: [
      { _id: 'h1', label: '2026-09', amount: 1800, actual: 1750 },
      { _id: 'h2', label: '2026-08', amount: 1500, actual: 1420 },
      { _id: 'h3', label: '2026-07', amount: 1500, actual: 1380 }
    ],

    // 圆环 stroke-dashoffset：圆周 = 2π × 48 ≈ 301.59
    // 64% 已用 → 剩余 36% → offset = 301.59 × 0.36 ≈ 108.57
    strokeOffset: 108.57
  },

  openBudget(e) {
    const type = e.currentTarget.dataset.type;
    const titleMap = { total: '总预算', guzi: '谷子预算', game: '游戏预算' };
    wx.showModal({
      title: `设置${titleMap[type] || '预算'}`,
      editable: true,
      placeholderText: '请输入金额',
      success: () => wx.showToast({ title: '已保存', icon: 'success' })
    });
  }
});
