const { remove } = require('./db.js');
exports.main = async (event) => {
  try { return { success: true, data: await remove('collectionContributions', event._id) }; }
  catch (e) { return { success: false, error: e.message }; }
};
