// utils/vocab.js — 个人词库（PRD 4.7）
// 规则：
//   - 首次输入新名称自动建库
//   - 同名不重复建（PRD 4.7.4 / 决策110）
//   - 修改词条直接覆盖并同步历史业务数据（决策109）
//   - 删除只移词条，业务数据保留（PRD 4.7.3）

const Storage = require('./storage.js');
const Sync = require('./sync.js');
const C = require('./constants.js');

function ensureDefaults() {
  const list = Storage.getVocabs();
  if (list.length > 0) return;

  const defaults = [];
  // 商品类型默认
  C.DEFAULT_PRODUCT_TYPES.forEach(name => {
    defaults.push({ _id: 'vb_pt_' + name, type: C.VOCAB_TYPE.PRODUCT_TYPE, name, createdAt: Date.now(), updatedAt: Date.now() });
  });
  // 渠道默认
  C.DEFAULT_CHANNELS.forEach(name => {
    defaults.push({ _id: 'vb_ch_' + name, type: C.VOCAB_TYPE.CHANNEL, name, createdAt: Date.now(), updatedAt: Date.now() });
  });
  Storage.setVocabs(defaults);
  // 入队同步（云端）
  defaults.forEach(v => Sync.enqueue('vocab', 'add', v));
}

// 按类型获取
function getByType(type) {
  return Storage.getVocabs().filter(v => v.type === type);
}

// 自动加入（或恢复已删词条 — 决策108/111/134）
function ensureName(type, name) {
  if (!name || !name.trim()) return null;
  name = name.trim();
  const list = Storage.getVocabs();
  const existing = list.find(v => v.type === type && v.name === name);
  if (existing) return existing;

  // 新建
  const item = {
    _id: 'vb_' + type + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    type, name,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  Storage.setVocabs([item, ...list]);
  Sync.enqueue('vocab', 'add', item);
  return item;
}

// 修改词条名称 — 同步更新历史业务数据（决策109）
function rename(id, newName) {
  if (!newName || !newName.trim()) return null;
  newName = newName.trim();
  const list = Storage.getVocabs();
  const i = list.findIndex(v => v._id === id);
  if (i < 0) return null;
  const old = list[i];

  // 同步更新本地业务数据
  const oldName = old.name;
  list[i] = Object.assign({}, old, { name: newName, updatedAt: Date.now() });
  Storage.setVocabs(list);

  if (old.type === C.VOCAB_TYPE.IP) {
    _renameInExpenses('ip', oldName, newName);
    _renameInCollections('ip', oldName, newName);
  } else if (old.type === C.VOCAB_TYPE.GAME) {
    _renameInExpenses('gameName', oldName, newName);
  } else if (old.type === C.VOCAB_TYPE.ROLE) {
    _renameInCollections('role', oldName, newName);
  } else if (old.type === C.VOCAB_TYPE.PRODUCT_TYPE) {
    _renameInExpenses('productType', oldName, newName);
    _renameInCollections('productType', oldName, newName);
  } else if (old.type === C.VOCAB_TYPE.CHANNEL) {
    _renameInExpenses('channel', oldName, newName);
  }

  Sync.enqueue('vocab', 'update', list[i]);
  return list[i];
}

function _renameInExpenses(field, oldName, newName) {
  const list = Storage.getExpenses();
  let changed = 0;
  list.forEach(e => {
    if (e[field] === oldName) { e[field] = newName; changed++; }
  });
  if (changed) Storage.setExpenses(list);
}
function _renameInCollections(field, oldName, newName) {
  const list = Storage.getCollections();
  let changed = 0;
  list.forEach(c => {
    if (c[field] === oldName) { c[field] = newName; changed++; }
  });
  if (changed) Storage.setCollections(list);
}

// 删除词条 — 业务数据保留（PRD 4.7.3 / 决策107）
function remove(id) {
  const list = Storage.getVocabs();
  const item = list.find(v => v._id === id);
  if (!item) return false;
  Storage.setVocabs(list.filter(v => v._id !== id));
  Sync.enqueue('vocab', 'delete', { _id: id });
  return true;
}

function clearAll() {
  const ids = Storage.getVocabs().map(v => v._id);
  Storage.setVocabs([]);
  ids.forEach(id => Sync.enqueue('vocab', 'delete', { _id: id }));
}

module.exports = {
  ensureDefaults,
  getByType,
  ensureName,
  rename,
  remove,
  clearAll
};
