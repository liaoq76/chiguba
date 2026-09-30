// utils/demo.js — 演示数据（首次启动可选填充 — 与用户确认）
// 帮助直观看到首页/消费/收藏/预售/统计/预算各页面效果

const Storage = require('./storage.js');
const Expense = require('./expense.js');
const Collection = require('./collection.js');
const Presale = require('./presale.js');
const Budget = require('./budget.js');
const Vocab = require('./vocab.js');

function fillDemo() {
  // 清空业务数据
  Storage.clearBusinessData();

  // 清掉示例数据可能产生的同步队列残留
  // 演示数据是本地预置的，不需要走云同步流程
  const queue = Storage.getSyncQueue().filter(q => q.status !== 'pending' && q.status !== 'syncing');
  // 演示场景下，索性一次性清空所有未完成项（云端如有重复数据，用户可自行清理）
  Storage.setSyncQueue([]);
  // 通知全局 pending 数字归零
  try {
    const Sync = require('./sync.js');
    if (Sync.updateGlobalPending) Sync.updateGlobalPending();
  } catch (e) {}

  const now = Date.now();
  const day = 86400000;

  // === 谷子消费（本月 + 上月）===
  const guziRecords = [
    { name: '芙宁娜吧唧', unitPrice: 35, quantity: 2, ip: '原神', productType: '吧唧', channel: '淘宝', source: 'official', date: now - 3 * day, addToCollection: true },
    { name: '那维莱特亚克力立牌', unitPrice: 80, quantity: 1, ip: '原神', productType: '亚克力立牌', channel: '闲鱼', date: now - 5 * day, addToCollection: true },
    { name: '纳西妲徽章套装', unitPrice: 45, quantity: 1, ip: '原神', productType: '徽章', channel: '官方商城', date: now - 7 * day, addToCollection: true },
    { name: '魈色纸', unitPrice: 28, quantity: 3, ip: '原神', productType: '色纸', channel: '同人摊位', source: 'fanmade', date: now - 10 * day, addToCollection: true },
    { name: '星穹铁道手办', unitPrice: 380, quantity: 1, ip: '崩坏星穹铁道', productType: '手办', channel: '京东', date: now - 12 * day, addToCollection: true, isPresale: true, presaleQty: 1, expectedShip: now + 20 * day },
    { name: '流莹同人本', unitPrice: 60, quantity: 2, ip: '崩坏星穹铁道', productType: '同人本', channel: '同人摊位', source: 'fanmade', date: now - 14 * day, addToCollection: true },
    { name: '初音毛绒挂件', unitPrice: 55, quantity: 1, ip: '初音未来', productType: '毛绒', channel: '淘宝', date: now - 18 * day, addToCollection: true },
    // 上月
    { name: '芙宁娜吧唧', unitPrice: 35, quantity: 1, ip: '原神', productType: '吧唧', channel: '淘宝', date: now - 32 * day, addToCollection: true },
    { name: '雷电影展门票周边', unitPrice: 120, quantity: 1, ip: '原神', productType: '其他', channel: '展会', date: now - 40 * day },
    { name: '未定事件簿徽章', unitPrice: 30, quantity: 2, ip: '未定事件簿', productType: '徽章', channel: '官方商城', date: now - 45 * day, addToCollection: true }
  ];
  guziRecords.forEach(r => Expense.create(Object.assign({ type: 'guzi' }, r)));

  // === 游戏氪金 ===
  const gameRecords = [
    { gameName: '原神', gameReason: '月卡', unitPrice: 30, quantity: 1, date: now - 1 * day },
    { gameName: '原神', gameReason: '抽卡', amount: 648, date: now - 4 * day },
    { gameName: '原神', gameReason: '礼包', unitPrice: 68, quantity: 1, date: now - 8 * day },
    { gameName: '崩坏星穹铁道', gameReason: '抽卡', amount: 328, date: now - 6 * day },
    { gameName: '未定事件簿', gameReason: '月卡', unitPrice: 25, quantity: 1, date: now - 15 * day },
    { gameName: '原神', gameReason: '月卡', unitPrice: 30, quantity: 1, date: now - 31 * day }
  ];
  gameRecords.forEach(r => Expense.create(Object.assign({ type: 'game' }, r)));

  // === 独立添加一个收藏 ===
  Collection.create({
    name: '绫华立牌',
    ip: '原神',
    role: '神里绫华',
    productType: '亚克力立牌',
    currentQty: 1,
    ownedQty: 1,
    startDate: now - 60 * day
  });

  // === 预算开启 ===
  Budget.setBudget('total', { enabled: true, amount: 1500, cycle: 'month', thresholds: [80, 100, 'over'] });
  Budget.setBudget('guzi', { enabled: true, amount: 800, cycle: 'month', thresholds: [80, 100, 'over'] });

  Vocab.ensureDefaults();
}

module.exports = { fillDemo };
