const { update } = require('./db.js');
exports.main = async (event) => {
  try {
    const { _id, ...patch } = event;
    return { success: true, data: await update('collections', _id, patch) };
  } catch (e) { return { success: false, error: e.message }; }
};
