// utils/storage.js
// 兼容层：保持原有 API 表面不变（getXxx / setXxx / addRecord / updateRecord / removeRecord）
// 内部实现：
//   1. 本地缓存（wx.setStorageSync）作为第一来源 —— 保证离线可用、写入即时生效
//   2. 异步同步到云开发（wx.cloud.callFunction）—— 多端同步
// 失败时仅本地生效，不会阻塞 UI；记录同步状态给「我的」页用。
const KEYS = {
  RECORDS: 'chigu_records',
  CATEGORIES: 'chigu_categories',
  BUDGET: 'chigu_budget',
  THEME: 'chigu_theme',
  PROFILE: 'chigu_profile',
  FIRST_USE: 'chigu_first_use',
  // 同步状态：{ lastPullAt, lastPushAt, lastError, pending }
  SYNC: 'chigu_sync'
};

const DEFAULT_CATEGORIES = [
  { id: 'game',     name: '游戏',     icon: '🎮', color: '#ff6f9d' },
  { id: 'anime',    name: '动漫',     icon: '🌸', color: '#7fbcff' },
  { id: 'gacha',    name: '抽卡',     icon: '✨', color: '#ffb84d' },
  { id: 'figure',   name: '手办/景品', icon: '🧸', color: '#b07cff' },
  { id: 'badge',    name: '吧唧/徽章', icon: '🎖️', color: '#5fd1c0' },
  { id: 'card',     name: '卡片/谷卡', icon: '🃏', color: '#ff8a78' },
  { id: 'book',     name: '漫画/小说', icon: '📖', color: '#8aa1ff' },
  { id: 'cosplay',  name: 'Cos/服饰', icon: '👗', color: '#ff6fb1' },
  { id: 'concert',  name: '演唱会/展会', icon: '🎤', color: '#f7a35c' },
  { id: 'peripheral', name: '周边日用', icon: '🛍️', color: '#a0d995' },
  { id: 'other',    name: '其他',     icon: '📦', color: '#bbbbbb' }
];

function read(key, fallback) {
  try {
    const v = wx.getStorageSync(key);
    if (v === '' || v === null || v === undefined) return fallback;
    return v;
  } catch (e) {
    return fallback;
  }
}

function write(key, val) {
  try {
    wx.setStorageSync(key, val);
    return true;
  } catch (e) {
    console.error('storage write error', key, e);
    return false;
  }
}

function getSyncState() {
  return read(KEYS.SYNC, { lastPullAt: 0, lastPushAt: 0, lastError: '', pending: 0 });
}

function setSyncState(patch) {
  const cur = getSyncState();
  write(KEYS.SYNC, Object.assign({}, cur, patch));
}

// ---------- 云端调用封装（失败一律容错返回，不影响本地）----------

function cloudReady() {
  return typeof wx.cloud !== 'undefined';
}

function callFn(name, data) {
  if (!cloudReady()) return Promise.reject(new Error('cloud not initialized'));
  return wx.cloud.callFunction({ name, data }).then(r => r.result);
}

function pushRecordToCloud(record) {
  return callFn('addRecord', { record })
    .then(r => {
      if (r && r.code === 0) {
        setSyncState({ lastPushAt: Date.now(), lastError: '' });
      } else {
        setSyncState({ lastError: (r && r.msg) || 'push failed' });
      }
      return r;
    })
    .catch(e => {
      setSyncState({ lastError: e.message || 'push failed' });
      // 静默失败，不影响本地
    });
}

function removeRecordFromCloud(id) {
  return callFn('deleteRecord', { id }).catch(e => {
    setSyncState({ lastError: e.message || 'delete failed' });
  });
}

function pullRecordsFromCloud() {
  return callFn('listRecords', { limit: 500 })
    .then(r => {
      if (r && r.code === 0 && Array.isArray(r.list)) {
        // 合并策略：以云端为准 + 本地更新过的覆盖云端（按 updatedAt 取最大）
        const local = read(KEYS.RECORDS, []);
        const byId = {};
        r.list.forEach(it => { byId[it.id] = it; });
        local.forEach(it => {
          const remote = byId[it.id];
          if (!remote || (it.updatedAt || 0) > (remote.updatedAt || 0)) {
            byId[it.id] = it;
          }
        });
        const merged = Object.values(byId).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        write(KEYS.RECORDS, merged);
        setSyncState({ lastPullAt: Date.now(), lastError: '' });
        return merged;
      }
      return null;
    })
    .catch(e => {
      setSyncState({ lastError: e.message || 'pull failed' });
      return null;
    });
}

module.exports = {
  KEYS,
  DEFAULT_CATEGORIES,

  initDefaults() {
    if (!wx.getStorageSync(KEYS.CATEGORIES)) {
      write(KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    }
    if (wx.getStorageSync(KEYS.FIRST_USE) === '') {
      write(KEYS.FIRST_USE, true);
    }
  },

  // —— 记录 ——
  getRecords() {
    return read(KEYS.RECORDS, []);
  },
  setRecords(list) {
    return write(KEYS.RECORDS, list || []);
  },
  addRecord(record) {
    const list = this.getRecords();
    record.id = record.id || ('r_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
    record.createdAt = record.createdAt || Date.now();
    record.updatedAt = Date.now();
    list.unshift(record);
    this.setRecords(list);
    // 异步同步云端
    pushRecordToCloud(record);
    return record;
  },
  updateRecord(id, patch) {
    const list = this.getRecords();
    const idx = list.findIndex(r => r.id === id);
    if (idx >= 0) {
      list[idx] = Object.assign({}, list[idx], patch, { updatedAt: Date.now() });
      this.setRecords(list);
      pushRecordToCloud(list[idx]);
      return list[idx];
    }
    return null;
  },
  removeRecord(id) {
    const list = this.getRecords().filter(r => r.id !== id);
    this.setRecords(list);
    removeRecordFromCloud(id);
    return true;
  },

  // —— 同步相关 ——
  syncReady: cloudReady,
  pullFromCloud: pullRecordsFromCloud,
  getSyncState,

  // —— 分类 ——
  getCategories() {
    return read(KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  },
  setCategories(list) {
    return write(KEYS.CATEGORIES, list);
  },

  // —— 预算 ——
  getBudget() {
    return read(KEYS.BUDGET, 0);
  },
  setBudget(v) {
    return write(KEYS.BUDGET, Number(v) || 0);
  },

  // —— 主题 ——
  getTheme() {
    return read(KEYS.THEME, 'pink');
  },
  setTheme(t) {
    return write(KEYS.THEME, t);
  },

  // —— 个人资料 ——
  getProfile() {
    return read(KEYS.PROFILE, { nickname: '吃谷人', avatar: '' });
  },
  setProfile(p) {
    return write(KEYS.PROFILE, p);
  },

  // —— 首次使用 ——
  isFirstUse() {
    return read(KEYS.FIRST_USE, true);
  },
  setFirstUsed() {
    return write(KEYS.FIRST_USE, false);
  }
};