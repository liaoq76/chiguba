// cloudfunctions/deleteFile/index.js
// 删除云存储文件（消费记录关联的图片清理）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  try {
    const fileList = Array.isArray(event.fileList) ? event.fileList : [];
    if (!fileList.length) {
      return { success: true, deleted: 0 };
    }
    const result = await cloud.deleteFile({ fileList });
    return { success: true, deleted: fileList.length, result };
  } catch (e) {
    return { success: false, error: e.message || String(e) };
  }
};
