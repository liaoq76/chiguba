// utils/expense.js — 消费业务封装（PRD 4.2 / 5.x）
// 把"一次记账沉淀消费/收藏/预售"的逻辑统一在这里（PRD 1.6 — 一次输入，多处使用）

const Storage = require('./storage.js');
const Sync = require('./sync.js');
const Collection = require('./collection.js');
const Presale = require('./presale.js');
const Vocab = require('./vocab.js');
const Budget = require('./budget.js');
const Image = require('./image.js');
const C = require('./constants.js');

// 生成 _id
function _genId() {
  return 'exp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

// 创建消费（PRD 4.2.3 / 决策44）
function create(payload) {
  const now = Date.now();

  // 自动建词库（PRD 4.7.2）
  if (payload.ip) Vocab.ensureName(C.VOCAB_TYPE.IP, payload.ip);
  if (payload.gameName) Vocab.ensureName(C.VOCAB_TYPE.GAME, payload.gameName);
  if (payload.roles && payload.roles.length) {
    payload.roles.forEach(r => Vocab.ensureName(C.VOCAB_TYPE.ROLE, r));
  } else if (payload.role) {
    Vocab.ensureName(C.VOCAB_TYPE.ROLE, payload.role);
  }
  if (payload.productType) Vocab.ensureName(C.VOCAB_TYPE.PRODUCT_TYPE, payload.productType);
  if (payload.channel) Vocab.ensureName(C.VOCAB_TYPE.CHANNEL, payload.channel);

  const record = Object.assign({
    _id: _genId(),
    type: C.EXPENSE_TYPE.GUZI,
    totalAmount: 0,
    quantity: 1,
    date: now,
    createdAt: now,
    updatedAt: now
  }, payload);

  // 谷子：自动计算总金额（PRD 4.2.8）
  if (record.type === C.EXPENSE_TYPE.GUZI) {
    record.totalAmount = (Number(record.unitPrice) || 0) * (Number(record.quantity) || 0);
  } else if (record.type === C.EXPENSE_TYPE.GAME) {
    if (record.gameReason === C.GAME_REASON.MONTHLY || record.gameReason === C.GAME_REASON.PACKAGE) {
      record.totalAmount = (Number(record.unitPrice) || 0) * (Number(record.quantity) || 0);
    } else {
      record.totalAmount = Number(record.amount) || 0;
    }
  }

  // 写本地
  Storage.addExpenseLocal(record);
  Sync.enqueue('expense', 'add', record);

  // 收藏贡献（PRD 4.3.6 / 决策64/66）
  if (record.addToCollection && record.type === C.EXPENSE_TYPE.GUZI) {
    const c = Collection.create({
      name: record.productName || record.name,
      ip: record.ip,
      role: record.role || (record.roles && record.roles[0]) || '',
      roles: record.roles || [],
      productType: record.productType,
      startDate: record.date
    });
    if (c) {
      Collection.adjustQty(c.collection._id, record.quantity, 'add');
      Collection.addContribution(record._id, c.collection._id, record.quantity);
    }
  }

  // 预售（PRD 4.4.2 / 决策44）
  if (record.isPresale) {
    Presale.createFromExpense(record._id, {
      name: record.productName || record.name,
      ip: record.ip,
      quantity: record.presaleQty || record.quantity,         // 默认继承，可独立修改（决策41）
      amount: record.totalAmount,
      expectedShip: record.expectedShip
    });
  }

  Budget.recalcCurrentPeriods();
  return record;
}

// 编辑消费（PRD 4.2.15 / 决策27/63）
function update(id, patch, options) {
  // options.syncCollection = true/false — 是否同步收藏贡献
  const list = Storage.getExpenses();
  const old = list.find(e => e._id === id);
  if (!old) return null;

  const newRec = Object.assign({}, old, patch, { updatedAt: Date.now() });

  // 重算金额（PRD 4.2.8）
  if (newRec.type === C.EXPENSE_TYPE.GUZI) {
    newRec.totalAmount = (Number(newRec.unitPrice) || 0) * (Number(newRec.quantity) || 0);
  } else if (newRec.type === C.EXPENSE_TYPE.GAME) {
    if (newRec.gameReason === C.GAME_REASON.MONTHLY || newRec.gameReason === C.GAME_REASON.PACKAGE) {
      newRec.totalAmount = (Number(newRec.unitPrice) || 0) * (Number(newRec.quantity) || 0);
    } else {
      newRec.totalAmount = Number(newRec.amount) || 0;
    }
  }

  Storage.updateExpenseLocal(id, newRec);
  Sync.enqueue('expense', 'update', newRec);

  // 如果图片变了，旧的云端文件要清理
  if (patch.images !== undefined && JSON.stringify(patch.images) !== JSON.stringify(old.images)) {
    const removedImgs = (old.images || []).filter(o => {
      return !(patch.images || []).some(n => n.localPath === o.localPath && n.cloudPath === o.cloudPath);
    });
    if (removedImgs.length) {
      Image.deleteCloudImages({ images: removedImgs });
    }
  }

  // 数量变更 → 询问是否同步收藏（决策63）
  if (options && options.syncCollection && old.quantity !== newRec.quantity) {
    Collection.updateContributionQty(id, newRec.quantity);
  }

  // 预售数量变更
  const presale = Storage.findPresaleByExpenseId(id);
  if (presale && patch.presaleQty !== undefined) {
    Presale.update(presale._id, { quantity: patch.presaleQty, amount: newRec.totalAmount });
  }

  // 新词库
  if (patch.ip && patch.ip !== old.ip) Vocab.ensureName(C.VOCAB_TYPE.IP, patch.ip);
  if (patch.gameName && patch.gameName !== old.gameName) Vocab.ensureName(C.VOCAB_TYPE.GAME, patch.gameName);

  Budget.recalcCurrentPeriods();
  return newRec;
}

// 删除消费（PRD 4.2.16 / 决策30/61/62）
function remove(id, options) {
  // options = { removeCollection: bool, removePresale: bool }
  const list = Storage.getExpenses();
  const old = list.find(e => e._id === id);
  if (!old) return false;

  // 按贡献数量处理收藏（决策62）
  if (options && options.removeCollection) {
    Collection.removeContributionAndDecCollection(id, old.quantity || 0);
  } else {
    // 仅删除贡献关系，不动收藏数量
    Collection.removeContributionOnly(id);
  }

  // 处理预售
  const presale = Storage.findPresaleByExpenseId(id);
  if (presale && options && options.removePresale) {
    Presale.removeByExpenseId(id, true);
  }

  Storage.removeExpenseLocal(id);
  Sync.enqueue('expense', 'delete', { _id: id });

  // 异步清理云端图片（best-effort，不阻塞删除）
  if (old.images && old.images.length) {
    Image.deleteCloudImages(old);
  }

  Budget.recalcCurrentPeriods();
  return true;
}

module.exports = {
  create,
  update,
  remove
};
