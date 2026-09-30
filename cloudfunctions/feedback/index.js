// cloudfunctions/feedback/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    if (!event.content || !event.content.trim()) {
      return { success: false, error: '请填写反馈内容' };
    }
    await db.collection('feedbacks').add({
      data: {
        _openid: openid,
        content: event.content.trim(),
        contact: (event.contact || '').trim(),
        createdAt: Date.now()
      }
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
