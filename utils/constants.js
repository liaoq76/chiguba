// utils/constants.js — 全局常量与默认值（PRD 4.2.6 / 4.2.7 / 4.6.3 / 4.6.4 / 4.6.5）

module.exports = {
  // 消费类型
  EXPENSE_TYPE: {
    GUZI: 'guzi',         // 谷子/周边
    GAME: 'game'          // 游戏氪金
  },

  // 谷子官方/同人
  GUZI_SOURCE: {
    OFFICIAL: 'official',
    FANMADE: 'fanmade'
  },

  // 游戏氪金原因
  GAME_REASON: {
    GACHA: '抽卡',
    DIRECT: '直购',
    GIFT: '赠送',
    MONTHLY: '月卡',
    PACKAGE: '礼包'
  },

  // 商品类型默认选项（PRD 4.2.6）
  DEFAULT_PRODUCT_TYPES: ['吧唧', '亚克力立牌', '徽章', '色纸', '手办', '毛绒', '同人本', '其他'],

  // 购买渠道默认选项（PRD 4.2.7）
  DEFAULT_CHANNELS: ['淘宝', '京东', '闲鱼', '官方商城', '线下店', '展会', '同人摊位', '其他'],

  // 词库类型
  VOCAB_TYPE: {
    IP: 'ip',
    GAME: 'game',
    ROLE: 'role',
    PRODUCT_TYPE: 'productType',
    CHANNEL: 'channel'
  },

  // 预售状态（PRD 4.4.4）
  PRESALE_STATUS: {
    PENDING: 'pending',
    RECEIVED: 'received'
  },

  // 预算类型（PRD 4.6.4）
  BUDGET_TYPE: {
    TOTAL: 'total',
    GUZI: 'guzi',
    GAME: 'game'
  },

  // 预算周期（PRD 4.6.3）
  BUDGET_CYCLE: {
    WEEK: 'week',
    MONTH: 'month',
    YEAR: 'year'
  },

  // 预算阈值（PRD 4.6.5）
  BUDGET_THRESHOLD: {
    P80: 80,
    P100: 100,
    OVER: 'over'    // 超预算
  },

  // 同步状态
  SYNC_STATUS: {
    PENDING: 'pending',
    SYNCING: 'syncing',
    FAILED: 'failed',
    DONE: 'done'
  },

  // 收藏模式
  COLLECTION_VIEW: {
    GRID: 'grid',
    LIST: 'list'
  },

  // 统计时间范围
  STATS_RANGE: {
    WEEK: 'week',
    MONTH: 'month',
    YEAR: 'year',
    CUSTOM: 'custom'
  },

  // 趋势模式
  TREND_MODE: {
    CUMULATIVE: 'cumulative',
    ACTUAL: 'actual'
  },

  // IP Top5 阈值
  IP_TOP_N: 5,

  // 预算历史保留数（PRD 4.6.10：最近一年，最多12个月）
  BUDGET_HISTORY_LIMIT: 12,

  // 最近消费展示数（PRD 4.1.5）
  RECENT_DISPLAY: 3,

  // 面包屑最大显示层级（PRD 4.5.14 / 决策176/177）
  BREADCRUMB_MAX: 3,

  // 本地存储 key
  STORAGE_KEY: {
    EXPENSES: 'chigu.expenses',
    COLLECTIONS: 'chigu.collections',
    COLLECTION_CONTRIB: 'chigu.collectionContrib',
    PRESALES: 'chigu.presales',
    BUDGETS: 'chigu.budgets',
    BUDGET_PERIODS: 'chigu.budgetPeriods',
    VOCABS: 'chigu.vocabs',
    SYNC_QUEUE: 'chigu.syncQueue',
    SYNC_MAP: 'chigu.syncMap',
    PROFILE: 'chigu.profile',
    GUIDE_SHOWN: 'guideShown',
    COLLECTION_VIEW: 'collectionView'
  },

  // 预算状态
  BUDGET_STATUS: {
    SAFE: 'safe',     // 未触发
    P80: 'p80',
    P100: 'p100',
    OVER: 'over'
  }
};
