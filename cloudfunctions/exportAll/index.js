// cloudfunctions/exportAll/index.js
// 入参：{ expenses, collections, presales, vocabs, budgets, budgetPeriods }
// 行为：生成 XLSX 并上传到云存储，返回 fileID
// 规则（PRD 4.8.2 / 4.8.3）：
//   - 不暴露内部ID、内部关联表（决策122/130）
//   - 6 张工作表，前缀"吃谷吗_"
//   - 顶部"吃谷吗数据导出"+导出时间（决策129）
//   - 不做格式优化（决策130）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const XLSX = require('xlsx');

function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(Number(ts));
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function fmtDT(ts) {
  if (!ts) return '';
  const d = new Date(Number(ts));
  return fmtDate(ts) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

exports.main = async (event) => {
  try {
    const now = Date.now();
    const exportTime = fmtDT(now);

    const wb = XLSX.utils.book_new();

    // === Sheet 1: 消费记录（PRD 决策 122）===
    const expRows = [['吃谷吗数据导出', '导出时间：' + exportTime], []];
    expRows.push([
      '消费日期', '类型', '商品/游戏名称', '单价', '数量', '总金额',
      'IP/游戏名', '角色', '商品类型', '购买渠道', '官方/同人',
      '是否预售', '是否加入收藏', '预计出荷', '备注'
    ]);
    (event.expenses || []).forEach(e => {
      expRows.push([
        fmtDate(e.date),
        e.type === 'guzi' ? '谷子' : '游戏',
        e.productName || e.gameName || '',
        e.unitPrice || '',
        e.quantity || '',
        e.totalAmount || 0,
        e.ip || e.gameName || '',
        (e.roles && e.roles.length ? e.roles.join('/') : e.role) || '',
        e.productType || '',
        e.channel || '',
        e.source === 'official' ? '官方' : (e.source === 'fanmade' ? '同人' : ''),
        e.isPresale ? '是' : '否',
        e.addToCollection ? '是' : '否',
        fmtDate(e.expectedShip),
        e.note || ''
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expRows), '吃谷吗_消费记录');

    // === Sheet 2: 当前收藏 ===
    const colRows = [['吃谷吗数据导出', '导出时间：' + exportTime], []];
    colRows.push([
      '商品名称', 'IP', '角色', '商品类型', '当前拥有数量', '曾拥有数量', '开始拥有日期'
    ]);
    (event.collections || []).filter(c => c.status !== 'history' && c.currentQty > 0).forEach(c => {
      colRows.push([
        c.name, c.ip || '', c.role || '',
        c.productType || '',
        c.currentQty || 0, c.ownedQty || 0,
        fmtDate(c.startDate)
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(colRows), '吃谷吗_收藏');

    // === Sheet 3: 收藏历史 ===
    const histRows = [['吃谷吗数据导出', '导出时间：' + exportTime], []];
    histRows.push([
      '商品名称', 'IP', '角色', '商品类型', '曾拥有数量', '开始拥有日期'
    ]);
    (event.collections || []).filter(c => c.status === 'history' || c.currentQty === 0).forEach(c => {
      histRows.push([
        c.name, c.ip || '', c.role || '',
        c.productType || '',
        c.ownedQty || 0,
        fmtDate(c.startDate)
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(histRows), '吃谷吗_收藏历史');

    // === Sheet 4: 预售 ===
    const preRows = [['吃谷吗数据导出', '导出时间：' + exportTime], []];
    preRows.push([
      '商品名称', 'IP', '数量', '金额', '预计出荷', '是否已收到'
    ]);
    (event.presales || []).forEach(p => {
      preRows.push([
        p.name, p.ip || '', p.quantity || 0, p.amount || 0,
        fmtDate(p.expectedShip),
        p.status === 'received' ? '是' : '否'
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(preRows), '吃谷吗_预售');

    // === Sheet 5: 个人词库 ===
    const vbRows = [['吃谷吗数据导出', '导出时间：' + exportTime], []];
    vbRows.push(['类型', '名称']);
    (event.vocabs || []).forEach(v => {
      const typeMap = { ip: 'IP', game: '游戏', role: '角色', productType: '商品类型', channel: '购买渠道' };
      vbRows.push([typeMap[v.type] || v.type, v.name]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(vbRows), '吃谷吗_个人词库');

    // === Sheet 6: 预算 ===
    const bgRows = [['吃谷吗数据导出', '导出时间：' + exportTime], []];
    bgRows.push([
      '预算类型', '是否开启', '周期', '金额', '阈值', '当前周期', '当前实际消费', '状态', '关闭时间'
    ]);
    const typeMap = { total: '总预算', guzi: '谷子预算', game: '游戏预算' };
    (event.budgets || []).forEach(b => {
      const period = (event.budgetPeriods || []).find(p => p.budgetId === b._id && p.type === b.type);
      bgRows.push([
        typeMap[b.type] || b.type,
        b.enabled ? '是' : '否',
        b.cycle === 'week' ? '周' : (b.cycle === 'month' ? '月' : '年'),
        b.amount,
        (b.thresholds || []).join('/'),
        period ? period.range.label : '',
        period ? period.actualAmount : 0,
        period ? period.status : '',
        b.closedAt ? fmtDT(b.closedAt) : ''
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bgRows), '吃谷吗_预算');

    // === 写入 buffer + 上传云存储 ===
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fileName = 'exports/' + now + '_' + Math.random().toString(36).slice(2, 8) + '.xlsx';
    const up = await cloud.uploadFile({
      cloudPath: fileName,
      fileContent: buf
    });
    return { success: true, fileID: up.fileID };
  } catch (e) {
    return { success: false, error: e.message || 'export error' };
  }
};
