// utils/collection.js — 收藏业务（PRD 4.3）
// 关键规则：
//   - 当前拥有：可加减、直接编辑（≥0）
//   - 曾拥有：只增不减（决策37）
//   - 数量归零 → 进入收藏历史（决策36）
//   - 同款判断：同 name + 同 ip 自动合并（已与用户确认）
//   - 每笔消费对收藏的贡献单独维护（决策64）

const Storage = require('./storage.js');
const Sync = require('./sync.js');
const C = require('./constants.js');

// 创建收藏（消费时勾选 / 独立添加）
function create(item) {
  // 查找同款（同 name + 同 ip）
  const list = Storage.getCollections();
  const exist = list.find(c =>
    c.name === item.name && (c.ip || '') === (item.ip || '')
  );

  if (exist) {
    // 自动合并到现有收藏
    exist.currentQty = (exist.currentQty || 0) + (item.currentQty || 0);
    exist.ownedQty = (exist.ownedQty || 0) + (item.currentQty || 0);
    exist.updatedAt = Date.now();
    Storage.setCollections(list);
    Sync.enqueue('collection', 'update', exist);
    return { collection: exist, merged: true };
  } else {
    const record = Object.assign({
      _id: 'col_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      currentQty: 0,
      ownedQty: 0,
      status: 'active',           // active / history
      startDate: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }, item);
    list.unshift(record);
    Storage.setCollections(list);
    Sync.enqueue('collection', 'add', record);
    return { collection: record, merged: false };
  }
}

// 调整数量（+/-/直接编辑）— PRD 4.3.4
function adjustQty(id, deltaOrFinal, mode) {
  const list = Storage.getCollections();
  const c = list.find(x => x._id === id);
  if (!c) return null;

  let newCurrent;
  if (mode === 'set') {
    newCurrent = Math.max(0, Math.floor(Number(deltaOrFinal) || 0));
  } else {
    newCurrent = (c.currentQty || 0) + Math.floor(Number(deltaOrFinal) || 0);
    if (newCurrent < 0) newCurrent = 0;
  }

  const oldCurrent = c.currentQty || 0;
  const increment = newCurrent - oldCurrent;
  c.currentQty = newCurrent;
  c.ownedQty = Math.max(c.ownedQty || 0, (c.ownedQty || 0) + Math.max(0, increment));
  c.updatedAt = Date.now();

  // 数量归零 → 进入历史（PRD 4.3.5 / 决策36）
  if (c.currentQty === 0) {
    c.status = 'history';
  } else {
    c.status = 'active';
  }

  Storage.setCollections(list);
  Sync.enqueue('collection', 'update', c);
  return c;
}

// 由消费创建贡献关系（消费勾选"加入收藏"时调用）
function addContribution(expenseId, collectionId, qty) {
  const list = Storage.getContributions();
  const exist = list.find(c => c.expenseId === expenseId);
  if (exist) return exist;
  const item = {
    _id: 'cc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    expenseId, collectionId, qty,
    createdAt: Date.now()
  };
  list.unshift(item);
  Storage.setContributions(list);
  Sync.enqueue('contribution', 'add', item);
  return item;
}

// 删除消费时按贡献数量处理收藏（PRD 4.3.6 / 决策62）
function removeContributionAndDecCollection(expenseId, decQty) {
  const list = Storage.getContributions();
  const c = list.find(x => x.expenseId === expenseId);
  if (!c) return null;

  const colList = Storage.getCollections();
  const col = colList.find(x => x._id === c.collectionId);
  if (col && decQty > 0) {
    col.currentQty = Math.max(0, (col.currentQty || 0) - decQty);
    // 曾拥有不减少（PRD 5.2 / 决策37）
    if (col.currentQty === 0) col.status = 'history';
    col.updatedAt = Date.now();
    Storage.setCollections(colList);
    Sync.enqueue('collection', 'update', col);
  }

  Storage.setContributions(list.filter(x => x.expenseId !== expenseId));
  Sync.enqueue('contribution', 'delete', { _id: c._id });
  return { contribution: c, collection: col };
}

// 编辑消费数量时同步贡献（PRD 4.3.7 / 决策63）
function updateContributionQty(expenseId, newQty) {
  const list = Storage.getContributions();
  const c = list.find(x => x.expenseId === expenseId);
  if (!c) return null;
  const delta = newQty - c.qty;
  c.qty = Math.max(0, newQty);
  Storage.setContributions(list);

  // 同步调整收藏
  if (delta !== 0) {
    const colList = Storage.getCollections();
    const col = colList.find(x => x._id === c.collectionId);
    if (col) {
      col.currentQty = Math.max(0, (col.currentQty || 0) + delta);
      col.ownedQty = Math.max(col.ownedQty || 0, (col.currentQty || 0));
      if (col.currentQty === 0) col.status = 'history';
      col.updatedAt = Date.now();
      Storage.setCollections(colList);
      Sync.enqueue('collection', 'update', col);
    }
  }
  Sync.enqueue('contribution', 'update', c);
  return c;
}

// 解除贡献关系（删除收藏关联消费时）
function removeContributionOnly(expenseId) {
  const list = Storage.getContributions();
  const c = list.find(x => x.expenseId === expenseId);
  if (!c) return null;
  Storage.setContributions(list.filter(x => x.expenseId !== expenseId));
  Sync.enqueue('contribution', 'delete', { _id: c._id });
  return c;
}

module.exports = {
  create,
  adjustQty,
  addContribution,
  removeContributionAndDecCollection,
  updateContributionQty,
  removeContributionOnly
};
