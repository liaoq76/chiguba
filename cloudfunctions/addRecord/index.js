// 云函数 addRecord
// 入参：{ record: { id, title, amount, categoryId, note, images, createdAt } }
// 行为：以 _openid 隔离，自动 upsert；返回 { code, id }
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const COL = 'records';

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const r = event.record || {};
  if (!r.id) return { code: -1, msg: 'missing id' };
  if (typeof r.amount !== 'number' || r.amount <= 0) return { code: -1, msg: 'invalid amount' };

  const doc = Object.assign({
    _openid: openid,
    updatedAt: Date.now()
  }, r);

  try {
    await db.collection(COL).doc(r.id).set({ data: doc });
    return { code: 0, id: r.id };
  } catch (e) {
    // 集合不存在时，云数据库会自动创建，无需手动 init
    const msg = e.message || '';
    if (msg.includes('collection not exist') || msg.includes('集合不存在')) {
      try {
        await db.createCollection(COL);
        await db.collection(COL).doc(r.id).set({ data: doc });
        return { code: 0, id: r.id };
      } catch (e2) {
        return { code: -1, msg: e2.message || 'db error after create' };
      }
    }
    return { code: -1, msg: msg || 'db error' };
  }
};