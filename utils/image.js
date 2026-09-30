// utils/image.js — 商品图片工具（PRD 4.2.4 谷子图片）
// 职责：
//   1. pickImage() — 选图 + 压缩
//   2. uploadPending() — 联网时把本地图片上传云端
//   3. deleteCloudImages() — 删除云端文件
//   4. resolveDisplay() — 决定展示用的 URL（cloudPath 优先，回退 localPath）
//   5. previewImage() — 微信原生图片预览

const FOLDER = 'expenses';

// 选图 + 压缩（长边 1280，质量 80）
function pickImage() {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      camera: 'back',
      success: async res => {
        const file = res.tempFiles[0];
        if (!file) return reject(new Error('未选择图片'));
        try {
          const compressed = await _compress(file.tempFilePath);
          resolve({
            localPath: compressed,
            status: 'pending'
          });
        } catch (e) {
          reject(e);
        }
      },
      fail: err => reject(err)
    });
  });
}

// 压缩（wx.compressImage）
function _compress(tempFilePath) {
  return new Promise((resolve, reject) => {
    wx.compressImage({
      src: tempFilePath,
      quality: 80,
      compressedWidth: 1280,
      compressedHeight: 1280,
      success: r => resolve(r.tempFilePath),
      fail: reject
    });
  });
}

// 上传待上传的图片（best-effort，不影响 sync 状态）
// 直接在 record.images 上原地修改 status / cloudPath
function uploadPending(record) {
  return new Promise(resolve => {
    if (!record || !record.images || !record.images.length) {
      return resolve(record);
    }
    const tasks = record.images.map(img => _uploadOne(record._id, img));
    Promise.all(tasks).then(() => resolve(record));
  });
}

function _uploadOne(expenseId, img) {
  return new Promise(resolve => {
    if (!img || img.status === 'uploaded' || !img.localPath) return resolve();
    if (!wx.cloud) {
      console.warn('[image] wx.cloud not ready, skip upload');
      img.status = 'failed';
      return resolve();
    }
    const ext = _guessExt(img.localPath);
    const cloudPath = `${FOLDER}/${expenseId}/${Date.now()}.${ext}`;
    wx.cloud.uploadFile({
      cloudPath,
      filePath: img.localPath,
      success: res => {
        img.cloudPath = res.fileID;
        img.status = 'uploaded';
        console.log('[image] uploaded:', cloudPath);
        resolve();
      },
      fail: err => {
        img.status = 'failed';
        console.warn('[image] upload failed:', err);
        resolve();
      }
    });
  });
}

function _guessExt(localPath) {
  if (!localPath) return 'jpg';
  const m = localPath.match(/\.(\w+)(?:\?|$)/);
  return m ? m[1].toLowerCase() : 'jpg';
}

// 删除云端图片（通过云函数 deleteFile）
function deleteCloudImages(record) {
  return new Promise(resolve => {
    if (!record || !record.images || !record.images.length) return resolve();
    const fileList = record.images
      .filter(img => img && img.cloudPath && img.status === 'uploaded')
      .map(img => img.cloudPath);
    if (!fileList.length) return resolve();
    if (!wx.cloud || !wx.cloud.callFunction) return resolve();
    wx.cloud.callFunction({
      name: 'deleteFile',
      data: { fileList },
      success: res => {
        console.log('[image] cloud files deleted:', fileList.length, res);
        resolve(res);
      },
      fail: err => {
        console.warn('[image] delete failed:', err);
        resolve();
      }
    });
  });
}

// 选择用于展示的图片 URL
// 优先用 cloudPath（云端 fileID），回退 localPath（本地临时路径）
function resolveDisplay(img) {
  if (!img) return '';
  if (img.cloudPath && img.status === 'uploaded') return img.cloudPath;
  return img.localPath || '';
}

// 微信原生图片预览
function preview(images, current) {
  const urls = (images || []).map(resolveDisplay).filter(Boolean);
  if (!urls.length) return;
  wx.previewImage({
    urls,
    current: current ? resolveDisplay(current) : urls[0]
  });
}

module.exports = {
  pickImage,
  uploadPending,
  deleteCloudImages,
  resolveDisplay,
  preview
};
