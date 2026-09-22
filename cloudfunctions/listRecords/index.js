// 云函数 listRecords
// 入参：{ since?: ts, limit?: number }
// 行为：以 _openid 隔离，返回该用户的全部记录（不去排序，客户端自行排序）
// 注意：云数据库新建集合默认没有 createdAt 索引，orderBy 可能失败或报错，
// 故直接在客户端（storage.js）排序，不依赖云端索引。
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const COL = 'records';

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const limit = Math.min(event.limit || 500, 1000);
  const since = Number(event.since) || 0;

  try {
    const _ = db.command;
    const query = since > 0
      ? { _openid: openid, updatedAt: _.gt(since) }
      : { _openid: openid };
    const res = await db.collection(COL)
      .where(query)
      .limit(limit)
      .get();
    return { code: 0, list: res.data };
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('collection not exist') || msg.includes('集合不存在')) {
      return { code: 0, list: [] };   // 集合还没创建，返回空，不算错误
    }
    return { code: -1, msg: msg || 'db error' };
  }
};