// 云函数 deleteRecord
// 入参：{ id }
// 行为：直接用文档的 _id 删除（addRecord 时 _id = 自定义 id，故无需先查）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const COL = 'records';

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const id = event.id;
  if (!id) return { code: -1, msg: 'missing id' };

  try {
    // 先拿文档确认归属（防止删别人的数据，cloud 函数有管理员权限故能跨 openid 查）
    const matched = await db.collection(COL)
      .where({ _openid: openid, id: id })
      .limit(1)
      .get();
    if (!matched.data || matched.data.length === 0) {
      return { code: 0, removed: 0 };
    }
    await db.collection(COL).doc(id).remove();
    return { code: 0, removed: 1 };
  } catch (e) {
    return { code: -1, msg: e.message || 'db error' };
  }
};