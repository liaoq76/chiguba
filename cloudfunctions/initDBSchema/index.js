// 云函数 initDBSchema
// 入参：{}
// 行为：创建 records 集合（若已存在会失败但忽略），并设置权限：仅创建者可读写
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

async function ensureCollection(name) {
  try {
    await db.createCollection(name);
    return { name, created: true };
  } catch (e) {
    if (/already exists|已存在/i.test(e.message || '')) {
      return { name, created: false };
    }
    throw e;
  }
}

exports.main = async () => {
  try {
    const records = await ensureCollection('records');
    return { code: 0, records };
  } catch (e) {
    return { code: -1, msg: e.message || 'db error' };
  }
};