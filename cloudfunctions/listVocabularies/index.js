const { listByOpenid } = require('./db.js');
exports.main = async (event) => {
  try {
    const data = await listByOpenid('vocabularies', event);
    return { success: true, data };
  } catch (e) { return { success: false, error: e.message }; }
};
