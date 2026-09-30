// utils/storage.js — 本地存储层（按业务对象隔离）
// 设计原则：所有本地存储操作只走这里，sync 队列和云函数调用在外层封装。

const K = require('./constants.js').STORAGE_KEY;

// 通用读写
function _read(key, fallback) {
  try {
    const v = wx.getStorageSync(key);
    return v === '' || v === undefined || v === null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}
function _write(key, val) {
  try {
    wx.setStorageSync(key, val);
    return true;
  } catch (e) {
    return false;
  }
}

// === 消费 ===
function getExpenses() { return _read(K.EXPENSES, []); }
function setExpenses(list) { _write(K.EXPENSES, list); }

function addExpenseLocal(expense) {
  const list = getExpenses();
  list.unshift(expense);
  setExpenses(list);
  return expense;
}
function updateExpenseLocal(id, patch) {
  const list = getExpenses();
  const i = list.findIndex(e => e._id === id);
  if (i >= 0) {
    list[i] = Object.assign({}, list[i], patch);
    setExpenses(list);
    return list[i];
  }
  return null;
}
function removeExpenseLocal(id) {
  const list = getExpenses().filter(e => e._id !== id);
  setExpenses(list);
  return list.length;
}

// === 收藏 ===
function getCollections() { return _read(K.COLLECTIONS, []); }
function setCollections(list) { _write(K.COLLECTIONS, list); }

function addCollectionLocal(item) {
  const list = getCollections();
  list.unshift(item);
  setCollections(list);
  return item;
}
function updateCollectionLocal(id, patch) {
  const list = getCollections();
  const i = list.findIndex(e => e._id === id);
  if (i >= 0) {
    list[i] = Object.assign({}, list[i], patch);
    setCollections(list);
    return list[i];
  }
  return null;
}

// === 收藏贡献关系 ===
function getContributions() { return _read(K.COLLECTION_CONTRIB, []); }
function setContributions(list) { _write(K.COLLECTION_CONTRIB, list); }

function addContributionLocal(item) {
  const list = getContributions();
  list.unshift(item);
  setContributions(list);
  return item;
}
function removeContributionsByExpense(expenseId) {
  const list = getContributions().filter(c => c.expenseId !== expenseId);
  setContributions(list);
  return list;
}
function updateContributionByExpense(expenseId, deltaQty) {
  const list = getContributions();
  const c = list.find(x => x.expenseId === expenseId);
  if (c) {
    c.qty = Math.max(0, c.qty + deltaQty);
    setContributions(list);
  }
  return c;
}

// === 预售 ===
function getPresales() { return _read(K.PRESALES, []); }
function setPresales(list) { _write(K.PRESALES, list); }

function addPresaleLocal(item) {
  const list = getPresales();
  list.unshift(item);
  setPresales(list);
  return item;
}
function updatePresaleLocal(id, patch) {
  const list = getPresales();
  const i = list.findIndex(e => e._id === id);
  if (i >= 0) {
    list[i] = Object.assign({}, list[i], patch);
    setPresales(list);
    return list[i];
  }
  return null;
}
function removePresaleLocal(id) {
  const list = getPresales().filter(e => e._id !== id);
  setPresales(list);
  return list.length;
}
function findPresaleByExpenseId(expenseId) {
  return getPresales().find(p => p.expenseId === expenseId);
}

// === 预算 ===
function getBudgets() { return _read(K.BUDGETS, []); }
function setBudgets(list) { _write(K.BUDGETS, list); }

function getBudget(type) {
  const list = getBudgets();
  return list.find(b => b.type === type) || null;
}
function upsertBudget(budget) {
  const list = getBudgets();
  const i = list.findIndex(b => b.type === budget.type);
  if (i >= 0) list[i] = Object.assign({}, list[i], budget);
  else list.unshift(budget);
  setBudgets(list);
  return budget;
}

// === 预算历史周期 ===
function getBudgetPeriods() { return _read(K.BUDGET_PERIODS, []); }
function setBudgetPeriods(list) { _write(K.BUDGET_PERIODS, list); }

function addBudgetPeriod(p) {
  const list = getBudgetPeriods();
  list.unshift(p);
  setBudgetPeriods(list);
  return p;
}

// === 个人词库 ===
function getVocabs() { return _read(K.VOCABS, []); }
function setVocabs(list) { _write(K.VOCABS, list); }

// === 同步队列 ===
function getSyncQueue() { return _read(K.SYNC_QUEUE, []); }
function setSyncQueue(list) { _write(K.SYNC_QUEUE, list); }

function getSyncMap() { return _read(K.SYNC_MAP, {}); }
function setSyncMap(map) { _write(K.SYNC_MAP, map); }

// === 用户配置 ===
function getProfile() {
  return _read(K.PROFILE, { nickname: '吃谷人', avatar: '', createdAt: Date.now() });
}
function setProfile(p) { _write(K.PROFILE, p); }

// === 收藏视图模式 ===
function getCollectionView() { return _read(K.COLLECTION_VIEW, 'grid'); }
function setCollectionView(v) { _write(K.COLLECTION_VIEW, v); }

// === 清空业务数据（PRD 4.8.4 — 保留词库）===
function clearBusinessData() {
  setExpenses([]);
  setCollections([]);
  setContributions([]);
  setPresales([]);
  setBudgets([]);
  setBudgetPeriods([]);
  // 注意：词库、用户配置、清空标志都不清
}

// === 清空词库（PRD 4.8.5）===
function clearVocabs() { setVocabs([]); }

module.exports = {
  // expenses
  getExpenses, setExpenses, addExpenseLocal, updateExpenseLocal, removeExpenseLocal,
  // collections
  getCollections, setCollections, addCollectionLocal, updateCollectionLocal,
  // contributions
  getContributions, setContributions, addContributionLocal, removeContributionsByExpense, updateContributionByExpense,
  // presales
  getPresales, setPresales, addPresaleLocal, updatePresaleLocal, removePresaleLocal, findPresaleByExpenseId,
  // budgets
  getBudgets, setBudgets, getBudget, upsertBudget,
  getBudgetPeriods, setBudgetPeriods, addBudgetPeriod,
  // vocabs
  getVocabs, setVocabs,
  // sync
  getSyncQueue, setSyncQueue, getSyncMap, setSyncMap,
  // profile
  getProfile, setProfile,
  // collection view
  getCollectionView, setCollectionView,
  // clear
  clearBusinessData, clearVocabs
};
