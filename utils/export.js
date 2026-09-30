// utils/export.js — XLSX 数据导出（PRD 4.8.2 / 4.8.3 / 决策122-130）
// 不做格式优化，不暴露内部ID（决策130）

const Storage = require('./storage.js');
const Format = require('./format.js');

// 用纯 JS 生成 .xlsx 的最小实现（基于 xml + zip 思路）
// 这里采用更轻量方案：使用 wx.saveFile 把数据写入 txt/csv 是不符合 PRD 的。
// 因此：调用云函数生成 XLSX（云端使用 xlsx 包），前端只负责拉取。
// 本文件封装"拉取 + 保存"流程。

async function exportToXlsx() {
  if (!wx.cloud) throw new Error('云开发未就绪');

  const expenses = Storage.getExpenses();
  const collections = Storage.getCollections();
  const presales = Storage.getPresales();
  const vocabs = Storage.getVocabs();
  const budgets = Storage.getBudgets();
  const budgetPeriods = Storage.getBudgetPeriods();

  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'exportAll',
      data: {
        expenses, collections, presales, vocabs, budgets, budgetPeriods
      },
      success: async res => {
        if (!res.result || !res.result.fileID) {
          reject(new Error('导出失败：未返回 fileID'));
          return;
        }
        try {
          // 下载并保存到本地
          const dl = await new Promise((rs, rj) => {
            wx.cloud.downloadFile({ fileID: res.result.fileID, success: rs, fail: rj });
          });
          const date = Format.formatDate(new Date()).replace(/\//g, '-');
          const fileName = `吃谷吗_数据导出_${date}.xlsx`;
          const saved = await new Promise((rs, rj) => {
            wx.saveFile({ tempFilePath: dl.tempFilePath, success: rs, fail: rj });
          });
          // 触发打开
          wx.openDocument({
            filePath: saved.savedFilePath,
            success: () => resolve(saved.savedFilePath),
            fail: () => resolve(saved.savedFilePath)
          });
        } catch (e) {
          reject(e);
        }
      },
      fail: reject
    });
  });
}

module.exports = { exportToXlsx };
