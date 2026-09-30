const { remove } = require('./db.js');
exports.main = async (event) => {
  try { return { success: true, data: await remove('vocabularies', event._id) }; }
  catch (e) { return { success: false, error: e.message }; }
};
