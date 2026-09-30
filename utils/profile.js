// utils/profile.js — 用户配置工具（头像/昵称）
// 仅小工具，复用 utils/image.js 做图片上传，封装自己的 nickname/avatar 写入 Storage

const Storage = require('./storage.js');
const Image = require('./image.js');

// 头像保存到云端的目录
const AVATAR_FOLDER = 'avatars';

// === 读取 / 保存 ===
function getProfile() {
  return Storage.getProfile();
}

function setNickname(nick) {
  if (!nick || !nick.trim()) return false;
  const p = Storage.getProfile();
  p.nickname = nick.trim().slice(0, 24);   // 限定 24 字符
  p.updatedAt = Date.now();
  Storage.setProfile(p);
  return true;
}

function setAvatarLocal(localPath) {
  if (!localPath) return false;
  const p = Storage.getProfile();
  p.avatarLocal = localPath;
  p.avatarCloud = '';     // 新本地路径 → 清旧 cloud
  p.avatarStatus = 'pending';
  p.updatedAt = Date.now();
  Storage.setProfile(p);
  return true;
}

function setAvatarCloud(fileID) {
  const p = Storage.getProfile();
  p.avatarCloud = fileID;
  p.avatarStatus = 'uploaded';
  p.updatedAt = Date.now();
  Storage.setProfile(p);
}

function setAvatarStatus(status) {
  const p = Storage.getProfile();
  p.avatarStatus = status;
  Storage.setProfile(p);
}

// === 显示用的头像 URL（优先 cloud，回退 local） ===
function getAvatarURL() {
  const p = Storage.getProfile();
  if (p.avatarCloud && p.avatarStatus === 'uploaded') return p.avatarCloud;
  return p.avatarLocal || '';
}

// === 上传头像到云端（best-effort） ===
// 假设已先调 setAvatarLocal(localPath)
function uploadAvatar() {
  return new Promise(resolve => {
    const p = Storage.getProfile();
    const localPath = p.avatarLocal;
    if (!localPath) return resolve(null);
    if (!wx.cloud || !wx.cloud.uploadFile) {
      console.warn('[profile] wx.cloud not ready');
      p.avatarStatus = 'failed';
      Storage.setProfile(p);
      return resolve(null);
    }
    const ext = _guessExt(localPath);
    const cloudPath = `${AVATAR_FOLDER}/avatar_${Date.now()}.${ext}`;
    wx.cloud.uploadFile({
      cloudPath,
      filePath: localPath,
      success: res => {
        p.avatarCloud = res.fileID;
        p.avatarStatus = 'uploaded';
        p.updatedAt = Date.now();
        Storage.setProfile(p);
        console.log('[profile] avatar uploaded:', cloudPath);
        resolve(res.fileID);
      },
      fail: err => {
        p.avatarStatus = 'failed';
        Storage.setProfile(p);
        console.warn('[profile] avatar upload failed:', err);
        resolve(null);
      }
    });
  });
}

function _guessExt(p) {
  if (!p) return 'jpg';
  const m = p.match(/\.(\w+)(?:\?|$)/);
  return m ? m[1].toLowerCase() : 'jpg';
}

// === 微信昵称登录 ===
// 小程序从 2021 年后不再允许通过 getUserProfile 拿到昵称，
// 唯一路径是让用户从键盘上方点击"使用微信昵称"按钮。
// 此函数：让 <input type="nickname"> 读取用户输入 → 返回到调用方
// 不直接调用 wx API，因为无法 API 主动"拿出"微信昵称
function extractWxNickname(input) {
  return input ? input.trim().slice(0, 24) : '';
}

module.exports = {
  getProfile,
  setNickname,
  setAvatarLocal,
  setAvatarCloud,
  setAvatarStatus,
  getAvatarURL,
  uploadAvatar,
  extractWxNickname
};
