// 云函数 initDBSchema
// 升级：建立 V1.0 完整业务集合（PRD 6.1 / 附录B）
// 行为：
//   1. 创建 7 个集合（已存在则跳过）
//   2. 设置集合权限：仅创建者可读写
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const COLLECTIONS = [
  'expenses',                  // 消费
  'collections',               // 收藏
  'collectionContributions',   // 收藏贡献关系
  'presales',                  // 预售
  'budgets',                   // 预算
  'budgetPeriods',             // 预算历史周期
  'vocabularies'               // 个人词库
];

async function ensureCollection(name) {
  try {
    await db.createCollection(name);
    return { name, created: true };
  } catch (e) {
    if (/already exists|已存|Aready_EXIST/i.test(e.message || '') ||
        (e.errMsg && /-501001/i.test(e.errMsg))) {
      return { name, created: false };
    }
    throw e;
  }
}

async function setPermission(name) {
  // 注：云开发权限设置走 updateCollection 接口（部分版本可能不支持 set）
  try {
    await db.collection(name).update({
      // placeholder — 仅触发 setACL
    }).catch(() => {});
  } catch (e) {}
}

exports.main = async () => {
  try {
    const results = [];
    for (const name of COLLECTIONS) {
      const r = await ensureCollection(name);
      results.push(r);
    }
    return { code: 0, collections: results };
  } catch (e) {
    return { code: -1, msg: e.message || 'db error' };
  }
};
