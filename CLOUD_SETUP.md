# 微信云开发接入指南

本文档说明如何在微信开发者工具中开通云开发环境，并将云函数部署到腾讯云。

---

## 第一步：开通云环境（GUI 操作）

> ⚠️ 这一步必须在**微信开发者工具**里手动做，无法替你完成。

1. 打开「吃谷吗」项目
2. 顶部菜单 → **云开发**（或快捷键 `Ctrl+Shift+9`）
3. 首次点开会弹出「开通云开发」弹窗，点「开通」
4. 同意协议，等待环境创建（约 30 秒）
5. 创建完成后，你会看到环境 ID（例如 `cloudbase-d4gsz9sx6c8d47a29`）
6. **确认 `app.js` 第 9 行的 `envId` 与你的云环境一致**（已默认填好）：

```js
envId: 'cloudbase-d4gsz9sx6c8d47a29',
```

---

## 第二步：部署云函数（GUI 操作）

在开发者工具里，**右键每个云函数目录**（注意：不是右键 `cloudfunctions/` 整个目录） → **上传并部署：云端安装依赖**。

> ⚠️ 每个云函数目录下都包含 `index.js / db.js / package.json / config.json` 四份文件，**不能少**。上传时整目录会打包上传。

### 部署顺序建议

| 顺序 | 云函数 | 作用 |
|---|---|---|
| **第 1 批（先）** | `initDBSchema` | 创建 7 个集合 |
| **第 2 批** | `feedback` | 反馈收集 |
| **第 3 批** | `clearAll` `exportAll` | 清空 + 导出（这两个需要装依赖）|
| **第 4 批（其余一起）** | 所有 addXxx / listXxx / updateXxx / deleteXxx | 业务 CRUD |

### 27 个云函数清单

```
initDBSchema
feedback
clearAll
exportAll
addExpenses            listExpenses           updateExpenses          deleteExpenses
addCollections         listCollections        updateCollections       deleteCollections
addCollectionContributions                       deleteCollectionContributions
addPresales            listPresales           updatePresales          deletePresales
addBudgets             listBudgets            updateBudgets
addBudgetPeriods       listBudgetPeriods      updateBudgetPeriods
addVocabularies        listVocabularies       updateVocabularies      deleteVocabularies
```

> 💡 **右键单击**每个目录就能看到「上传并部署」。一次部署一个目录，不要试图批量上传整个 `cloudfunctions/`（会报 `_shared` 不存在的错——其实旧版本有 `_shared`，现已删除）。

---

## 第三步：调用 `initDBSchema` 创建 7 个集合

部署成功后，进入云开发控制台 → 云函数 → 找到 `initDBSchema` → 点 **测试** → 输入 `{}`（空对象） → 点 **运行**。

预期返回：

```json
{
  "code": 0,
  "collections": [
    { "name": "expenses", "created": true },
    { "name": "collections", "created": true },
    { "name": "collectionContributions", "created": true },
    { "name": "presales", "created": true },
    { "name": "budgets", "created": true },
    { "name": "budgetPeriods", "created": true },
    { "name": "vocabularies", "created": true }
  ]
}
```

每个 `created: true` 表示新建成功。如果看到 `created: false`，说明该集合已存在（再次运行不会出错）。

> 💡 **快速验证**：云开发控制台 → 数据库 → 应该能看到上面 7 个集合。

---

## 第四步：设置数据库权限

进入云开发控制台 → 数据库 → 逐个设置每个集合的权限：

```
权限设置：仅创建者可读写
```

> 这一步决定了"用户 A 看不到用户 B 的数据"。所有 `addXxx / listXxx / updateXxx / deleteXxx` 云函数都按 `_openid` 字段过滤，无需在前端做权限判断。

---

## 第五步：上传体验版 + 真机测试

1. 微信开发者工具右上角 → **上传**（填版本号 + 项目备注）
2. 微信公众平台 → 版本管理 → 设为**体验版**
3. 体验码扫码 → 在手机上真实测试：
   - 记一笔（谷子 + 游戏）
   - 加收藏 + 数量归零 → 进历史
   - 勾选预售 → 标记已收到
   - 开启预算 → 改金额 → 看首页摘要
   - 关闭网络 → 记一笔 → 首页应显示"待同步" → 打开网络 → 自动清零

---

## 常见问题

### Q：上传时报 `FunctionName取值与规范不符`
**原因**：目录名以 `_` 开头（旧版有 `_shared`，已删除）。
**解决**：确保 `cloudfunctions/` 下没有 `_` 开头的目录。

### Q：上传时报 `Cannot find module './db.js'`
**原因**：旧版云函数目录里缺少 `db.js` 文件。
**解决**：重新部署，确保每个云函数目录里都有 `db.js`。

### Q：运行时 `wx.cloud is not a function`
**原因**：`app.js` 里没调 `wx.cloud.init(...)`。
**解决**：已修复，确保使用最新的 `app.js`。

### Q：`env` 参数无效
**原因**：云环境 ID 填错了。
**解决**：把 `app.js` 第 9 行 `envId` 改成你的实际环境 ID（云开发控制台 → 设置 → 环境 ID）。

### Q：集合创建失败 / `collection not exists`
**原因**：`initDBSchema` 没运行，或者网络问题。
**解决**：重新在云函数控制台运行 `initDBSchema`（幂等，可重复执行）。

---

## 云开发控制台入口

- 微信开发者工具 → 顶部「云开发」按钮
- 查看云函数、数据库、存储、监控、计费
