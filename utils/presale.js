// utils/presale.js — 预售业务（PRD 4.4）
// 关键规则：
//   - 预售数量默认继承消费数量，可独立修改（PRD 4.4.3 / 决策41）
//   - 只有 待收到 / 已收到 两态（PRD 4.4.4）
//   - 部分到货不能标记已收到（PRD 4.4.5 / 决策42）
//   - 预计出荷允许过去/今天/未来（PRD 4.4.6）
//   - 删除预售不影响消费和收藏（PRD 4.4.12）

const Storage = require('./storage.js');
const Sync = require('./sync.js');
const C = require('./constants.js');

// 由消费勾选预售时创建
function createFromExpense(expenseId, payload) {
  const record = Object.assign({
    _id: 'pre_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    expenseId,
    status: C.PRESALE_STATUS.PENDING,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }, payload);

  const list = Storage.getPresales();
  list.unshift(record);
  Storage.setPresales(list);
  Sync.enqueue('presale', 'add', record);
  return record;
}

// 标记已收到
function markReceived(id) {
  const list = Storage.getPresales();
  const p = list.find(x => x._id === id);
  if (!p) return null;
  p.status = C.PRESALE_STATUS.RECEIVED;
  p.receivedAt = Date.now();
  p.updatedAt = Date.now();
  Storage.setPresales(list);
  Sync.enqueue('presale', 'update', p);
  return p;
}

// 修改预售（数量 / 预计出荷）
function update(id, patch) {
  const list = Storage.getPresales();
  const p = list.find(x => x._id === id);
  if (!p) return null;
  Object.assign(p, patch, { updatedAt: Date.now() });
  Storage.setPresales(list);
  Sync.enqueue('presale', 'update', p);
  return p;
}

// 删除预售（不影响消费和收藏，PRD 4.4.12）
function remove(id) {
  const list = Storage.getPresales();
  const p = list.find(x => x._id === id);
  if (!p) return false;
  Storage.setPresales(list.filter(x => x._id !== id));
  Sync.enqueue('presale', 'delete', { _id: id });
  return true;
}

// 删除消费时询问用户（PRD 4.2.16 / 决策61）
function removeByExpenseId(expenseId, alsoRemove) {
  if (!alsoRemove) return false;
  const list = Storage.getPresales();
  const p = list.find(x => x.expenseId === expenseId);
  if (!p) return false;
  Storage.setPresales(list.filter(x => x.expenseId !== expenseId));
  Sync.enqueue('presale', 'delete', { _id: p._id });
  return true;
}

module.exports = {
  createFromExpense,
  markReceived,
  update,
  remove,
  removeByExpenseId
};
