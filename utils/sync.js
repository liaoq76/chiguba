// utils/sync.js — 离线同步队列（PRD 6.3 / 6.4）
// 策略：本地优先 + 待同步队列 + 自动重试 + 逐笔同步（不合并）

const Storage = require('./storage.js');
const Image = require('./image.js');
const C = require('./constants.js');

const COLLECTION_MAP = {
  expense: { cloud: 'expenses', local: 'expenses' },
  collection: { cloud: 'collections', local: 'collections' },
  contribution: { cloud: 'collectionContributions', local: 'contributions' },
  presale: { cloud: 'presales', local: 'presales' },
  budget: { cloud: 'budgets', local: 'budgets' },
  budgetPeriod: { cloud: 'budgetPeriods', local: 'budgetPeriods' },
  vocab: { cloud: 'vocabularies', local: 'vocabs' }
};

// 入队：写入本地 + 入队（如果在线则立即尝试）
function enqueue(type, action, payload) {
  const queue = Storage.getSyncQueue();
  const item = {
    _id: 'sq_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    type, action, payload,
    status: C.SYNC_STATUS.PENDING,
    retry: 0,
    createdAt: Date.now()
  };
  queue.push(item);
  Storage.setSyncQueue(queue);

  // 触发同步（不阻塞）
  flushQueue();
  return item;
}

function pendingCount() {
  return Storage.getSyncQueue().filter(q => q.status !== C.SYNC_STATUS.DONE).length;
}

// 调度器：每 30 秒检查一次（在 onLaunch 中启动）
let _scheduler = null;
function startScheduler() {
  if (_scheduler) return;
  _scheduler = setInterval(() => {
    flushQueue();
  }, 30000);
}

function stopScheduler() {
  if (_scheduler) {
    clearInterval(_scheduler);
    _scheduler = null;
  }
}

// 冲刷队列（按入队顺序，逐笔）
async function flushQueue() {
  return (async () => {
    const queue = Storage.getSyncQueue();
    const todo = queue.filter(q => q.status !== C.SYNC_STATUS.DONE);
    if (todo.length === 0) {
      updateGlobalPending();
      return;
    }

    for (const item of todo) {
      item.status = C.SYNC_STATUS.SYNCING;
      Storage.setSyncQueue(queue);

      try {
        await _callCloud(item);

        if (item.type === 'expense' && (item.action === 'add' || item.action === 'update')) {
          const payload = item.payload;
          if (payload && payload.images && payload.images.length) {
            await Image.uploadPending(payload);
            const local = Storage.getExpenses().find(e => e._id === payload._id);
            if (local) {
              local.images = payload.images;
              Storage.setExpenses(Storage.getExpenses());
            }
            const hasUploaded = payload.images.some(img => img.status === 'uploaded' && img.cloudPath);
            if (hasUploaded && item.action === 'add' && !item._imageSynced) {
              item._imageSynced = true;
              Storage.setSyncQueue(queue);
              _scheduledEnqueue = _scheduledEnqueue || setTimeout(() => {
                _scheduledEnqueue = null;
                enqueue('expense', 'update', Object.assign({}, payload, { _imagesOnly: true }));
              }, 50);
            }
          }
        }

        item.status = C.SYNC_STATUS.DONE;
      } catch (e) {
        item.status = C.SYNC_STATUS.FAILED;
        item.retry += 1;
        item.lastError = e.message || String(e);
      }
      Storage.setSyncQueue(queue);
      updateGlobalPending();
    }
  })();
}

let _scheduledEnqueue = null;

function updateGlobalPending() {
  const app = getApp();
  if (app && app.globalData) {
    app.globalData.pendingSyncCount = pendingCount();
    if (app.emitSyncUpdate) app.emitSyncUpdate();
  }
}

// 调用云函数
function _callCloud(item) {
  return new Promise((resolve, reject) => {
    const map = COLLECTION_MAP[item.type];
    if (!map) return reject(new Error('unknown type: ' + item.type));

    let action;
    if (item.action === 'add') action = 'add' + capitalize(map.cloud);
    else if (item.action === 'update') action = 'update' + capitalize(map.cloud);
    else if (item.action === 'delete') action = 'delete' + capitalize(map.cloud);
    else return reject(new Error('unknown action: ' + item.action));

    if (!wx.cloud) return reject(new Error('wx.cloud not ready'));
    if (!wx.cloud.callFunction) return reject(new Error('callFunction not ready'));

    wx.cloud.callFunction({
      name: action,
      data: item.payload,
      success: res => {
        if (res.result && res.result.success === false) {
          reject(new Error(res.result.error || 'cloud error'));
        } else {
          resolve(res.result);
        }
      },
      fail: err => reject(err)
    });
  });
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// 强制立即重试失败的项
function retryFailed() {
  const queue = Storage.getSyncQueue();
  queue.forEach(q => {
    if (q.status === C.SYNC_STATUS.FAILED) q.status = C.SYNC_STATUS.PENDING;
  });
  Storage.setSyncQueue(queue);
  flushQueue();
}

// 清空已完成项
function cleanDone() {
  const queue = Storage.getSyncQueue().filter(q => q.status !== C.SYNC_STATUS.DONE);
  Storage.setSyncQueue(queue);
  updateGlobalPending();
}

/**
 * 清理已完成 + 已失败的项
 * 适用场景：用户已在云端手动导入过数据，本地队列残留；或失败项重试多次仍失败。
 * 返回清理条数
 */
function cleanDoneAndFailed() {
  const queue = Storage.getSyncQueue();
  const dropped = queue.filter(q => q.status === C.SYNC_STATUS.DONE || q.status === C.SYNC_STATUS.FAILED).length;
  const remain = queue.filter(q => q.status === C.SYNC_STATUS.PENDING || q.status === C.SYNC_STATUS.SYNCING);
  Storage.setSyncQueue(remain);
  updateGlobalPending();
  return dropped;
}

module.exports = {
  enqueue,
  pendingCount,
  flushQueue,
  startScheduler,
  stopScheduler,
  retryFailed,
  cleanDone,
  cleanDoneAndFailed,
  updateGlobalPending
};
