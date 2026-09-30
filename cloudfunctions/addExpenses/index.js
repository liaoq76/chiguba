const { add } = require('./db.js');
exports.main = async (event) => {
  try { return { success: true, data: await add('expenses', event) }; }
  catch (e) { return { success: false, error: e.message }; }
};
