// cloudfunctions/_shared/db.js
// 云函数共享：DB 初始化 + 通用 CRUD
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

function getOpenId(event) {
  const wxContext = cloud.getWXContext();
  return wxContext.OPENID || (event && event._openid) || '';
}

async function add(collection, data) {
  const openid = getOpenId(data);
  const now = Date.now();
  const record = Object.assign({}, data, {
    _openid: openid,
    createdAt: now,
    updatedAt: now
  });
  delete record._openid_placeholder;
  const res = await db.collection(collection).add({ data: record });
  return Object.assign({}, record, { _id: res._id });
}

async function update(collection, id, patch) {
  patch.updatedAt = Date.now();
  await db.collection(collection).doc(id).update({ data: patch });
  return Object.assign({ _id: id }, patch);
}

async function remove(collection, id) {
  await db.collection(collection).doc(id).remove();
  return { _id: id };
}

async function listByOpenid(collection, where) {
  const openid = getOpenId(where || {});
  const _where = Object.assign({ _openid: openid }, where || {});
  delete _where._openid_placeholder;
  const res = await db.collection(collection).where(_where).limit(1000).get();
  return res.data || [];
}

module.exports = {
  cloud, db, _,
  getOpenId,
  add, update, remove, listByOpenid
};
