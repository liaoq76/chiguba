// utils/category.js
const Storage = require('./storage.js');

function getCategoryById(id) {
  const list = Storage.getCategories();
  return list.find(c => c.id === id) || { id, name: '未分类', icon: '📦', color: '#bbb' };
}

module.exports = { getCategoryById };