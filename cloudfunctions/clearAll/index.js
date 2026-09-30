// cloudfunctions/clearAll/index.js
// 清空当前 openid 的业务数据（PRD 4.8.4）
//   - 清空：消费、当前收藏、收藏历史、预售、预算、预算历史
//   - 保留：个人词库（决策132）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const COLLECTIONS = [
  'expenses',
  'collections',
  'collectionContributions',
  'presales',
  'budgets',
  'budgetPeriods'
];

exports.main = async () => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const summary = {};
    for (const c of COLLECTIONS) {
      const res = await db.collection(c).where({ _openid: openid }).remove();
      summary[c] = (res.removed || 0);
    }
    return { success: true, removed: summary };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
