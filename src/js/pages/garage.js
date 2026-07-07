/* ===== My Garage Page — Property Slot System ===== */
window.GTA = window.GTA || {};

GTA.Garage = (function () {
  var Utils = GTA.Utils;
  var Catalog = GTA.VehicleCatalog;
  var garages = [];               // All DB garage records
  var currentGarageId = null;    // Currently viewed garage (vehicle grid)
  var highlightVehicleId = null;
  var collapsedCategories = {};
  var isManageView = false;      // true = showing card management, false = vehicle grid

  // Drag state flags
  var dragState = {
    type: null,
    sourceGarageId: null,
    vehicleId: null,
    recordId: null
  };
  var clickTrack = { startX: 0, startY: 0, moved: false };

  // ==================== PROPERTY PRESETS ====================

  var PROPERTY_SLOTS = [
    // 公寓/车库 — 10 slots (GTA allows owning multiple apartments)
    { slotIndex: 0, name: '公寓 1',  category: '公寓/车库', type: 'apartment', icon: '', floors: 1 },
    { slotIndex: 1, name: '公寓 2',  category: '公寓/车库', type: 'apartment', icon: '', floors: 1 },
    { slotIndex: 2, name: '公寓 3',  category: '公寓/车库', type: 'apartment', icon: '', floors: 1 },
    { slotIndex: 3, name: '公寓 4',  category: '公寓/车库', type: 'apartment', icon: '', floors: 1 },
    { slotIndex: 4, name: '公寓 5',  category: '公寓/车库', type: 'apartment', icon: '', floors: 1 },
    { slotIndex: 5, name: '公寓 6',  category: '公寓/车库', type: 'apartment', icon: '', floors: 1 },
    { slotIndex: 6, name: '公寓 7',  category: '公寓/车库', type: 'apartment', icon: '', floors: 1 },
    { slotIndex: 7, name: '公寓 8',  category: '公寓/车库', type: 'apartment', icon: '', floors: 1 },
    { slotIndex: 8, name: '公寓 9',  category: '公寓/车库', type: 'apartment', icon: '', floors: 1 },
    { slotIndex: 9, name: '公寓 10', category: '公寓/车库', type: 'apartment', icon: '', floors: 1 },

    // 多层车库 — 5 slots
    { slotIndex: 0, name: 'CEO 办公室', category: '多层车库', type: 'ceo-office', icon: '',
      floors: [{ name: '办公室车库 1', slots: 20 }, { name: '办公室车库 2', slots: 20 }, { name: '办公室车库 3', slots: 20 }] },
    { slotIndex: 0, name: '夜总会', category: '多层车库', type: 'nightclub', icon: '',
      floors: [{ name: '货运入口', slots: 1 }, { name: 'B1', slots: 3 }, { name: 'B2', slots: 10 }, { name: 'B3', slots: 10 }, { name: 'B4', slots: 10 }] },
    { slotIndex: 0, name: '竞技场工作室', category: '多层车库', type: 'arena-workshop', icon: '',
      floors: [{ name: '竞技场工作室', slots: 10 }, { name: '竞技场工作室 B1', slots: 10 }, { name: '竞技场工作室 B2', slots: 10 }] },
    { slotIndex: 0, name: '日蚀大道车库', category: '多层车库', type: 'eclipse-garage', icon: '',
      floors: [{ name: '日蚀大道车库 B1', slots: 10 }, { name: '日蚀大道车库 B2', slots: 10 }, { name: '日蚀大道车库 B3', slots: 10 }, { name: '日蚀大道车库 B4', slots: 10 }, { name: '日蚀大道车库 B5', slots: 10 }] },
    { slotIndex: 0, name: '好麦坞车友俱乐部', category: '多层车库', type: 'vinewood-club', icon: '',
      floors: [{ name: '地下 1 层', slots: 20 }, { name: '地下 2 层', slots: 20 }, { name: '地下 3 层', slots: 20 }, { name: '地下 4 层', slots: 20 }, { name: '地下 5 层', slots: 20 }] },

    // 单层车库 — 8 slots (1 per type)
    { slotIndex: 0, name: '会所',             category: '单层车库', type: 'clubhouse',       icon: '', floors: 1 },
    { slotIndex: 0, name: '设施',             category: '单层车库', type: 'facility',        icon: '', floors: 1 },
    { slotIndex: 0, name: '赌场空中别墅',     category: '单层车库', type: 'penthouse',       icon: '', floors: 1 },
    { slotIndex: 0, name: '游戏厅',           category: '单层车库', type: 'arcade',          icon: '', floors: 1 },
    { slotIndex: 0, name: '改装铺',           category: '单层车库', type: 'auto-shop',       icon: '', floors: 1 },
    { slotIndex: 0, name: '事务所',           category: '单层车库', type: 'agency',          icon: '', floors: 1 },
    { slotIndex: 0, name: '保金办公室',       category: '单层车库', type: 'bail-office',     icon: '', floors: 1 },
    { slotIndex: 0, name: '达内尔兄弟服装厂', category: '单层车库', type: 'darnell-factory', icon: '', floors: 1 },

    // 豪宅 — 3 slots
    { slotIndex: 0, name: '通瓦房产',   category: '豪宅', type: 'mansion', icon: '', floors: 1 },
    { slotIndex: 1, name: '里奇曼别墅', category: '豪宅', type: 'mansion', icon: '', floors: 1 },
    { slotIndex: 2, name: '好麦坞宅邸', category: '豪宅', type: 'mansion', icon: '', floors: 1 },

    // 特殊载具仓库 — 1 slot
    { slotIndex: 0, name: '特殊载具仓库', category: '特殊载具仓库', type: 'vehicle-warehouse', icon: '', floors: 1 },

    // 服务载具 — 5 slots (unique vehicles, 1 each)
    { slotIndex: 0, name: '致幻剂实验室',   category: '服务载具', type: 'acid-lab', icon: '', floors: 1 },
    { slotIndex: 0, name: '复仇者',         category: '服务载具', type: 'avenger',  icon: '', floors: 1 },
    { slotIndex: 0, name: '虎鲸',           category: '服务载具', type: 'kosatka',  icon: '', floors: 1 },
    { slotIndex: 0, name: '恐霸',           category: '服务载具', type: 'terabyte', icon: '', floors: 1 },
    { slotIndex: 0, name: '机动作战中心',   category: '服务载具', type: 'moc',      icon: '', floors: 1 },

    // 机库/天马 — 2 slots
    { slotIndex: 0, name: '机库',     category: '机库/天马', type: 'hangar',  icon: '', floors: 1 },
    { slotIndex: 0, name: '帕加索斯', category: '机库/天马', type: 'pegasus', icon: '', floors: 1 },

    // 其他资产 — 2 slots
    { slotIndex: 0, name: '怪胎店', category: '其他资产', type: 'freakshop', icon: '', floors: 1 },
    { slotIndex: 0, name: '地堡',   category: '其他资产', type: 'bunker',    icon: '', floors: 1 }
  ];

  var PROPERTY_LOCATIONS = {
    'apartment': {
      'high-end': [
        { name: '日蚀塔楼 顶层公寓 1', slots: 13 },
        { name: '日蚀塔楼 顶层公寓 2', slots: 13 },
        { name: '日蚀塔楼 顶层公寓 3', slots: 13 },
        { name: '日蚀塔楼 3 号公寓', slots: 13 },
        { name: '日蚀塔楼 5 号公寓', slots: 13 },
        { name: '日蚀塔楼 9 号公寓', slots: 13 },
        { name: '日蚀塔楼 31 号公寓', slots: 13 },
        { name: '日蚀塔楼 40 号公寓', slots: 13 },
        { name: '佩罗高地 4 号公寓', slots: 13 },
        { name: '佩罗高地 7 号公寓', slots: 13 },
        { name: '佩罗高地 20 号公寓', slots: 13 },
        { name: '理查兹尊爵 2 号公寓', slots: 13 },
        { name: '理查兹尊爵 4 号公寓', slots: 13 },
        { name: '理查兹尊爵 51 号公寓', slots: 13 },
        { name: '金箔塔楼 29 号公寓', slots: 13 },
        { name: '金箔塔楼 42 号公寓', slots: 13 },
        { name: '金箔塔楼 45 号公寓', slots: 13 },
        { name: '威泽尔广场 26 号公寓', slots: 13 },
        { name: '威泽尔广场 70 号公寓', slots: 13 },
        { name: '威泽尔广场 101 号公寓', slots: 13 },
        { name: '阿尔塔街 3 号大厦 10 号公寓', slots: 13 },
        { name: '阿尔塔街 3 号大厦 57 号公寓', slots: 13 },
        { name: '正直小道 4 号 28 号公寓', slots: 13 },
        { name: '正直小道 4 号 30 号公寓', slots: 13 },
        { name: '正直小道 4 号 35 号公寓', slots: 13 },
        { name: '麦伟雷车道 2113 号', slots: 13 },
        { name: '威斯皮蒙车道 3677 号', slots: 13 },
        { name: '山顶大街 2866 号', slots: 13 },
        { name: '山顶大街 2874 号', slots: 13 },
        { name: '米尔顿路 2117 号', slots: 13 },
        { name: '山顶大街 2868 号', slots: 13 },
        { name: '山顶大街 2862 号', slots: 13 },
        { name: '七叶树大街北段 2045 号', slots: 13 },
        { name: '七叶树大街北段 2044 号', slots: 13 },
        { name: '野生燕麦车道 3655 号', slots: 13 }
      ],
      'mid-range': [
        { name: '物质路 12 号', slots: 8 },
        { name: '普罗科皮奥车道 4584 号', slots: 8 },
        { name: '普罗科皮奥车道 4401 号', slots: 8 },
        { name: '刽子手大街 4 号', slots: 8 },
        { name: '皇家楼 19 号公寓', slots: 8 },
        { name: '拉斯拉古纳斯大道 0604 号 4 号公寓', slots: 8 },
        { name: '西班牙大街 0605 号 1 号公寓', slots: 8 },
        { name: '帕尔街 1162 号 3 号公寓', slots: 8 },
        { name: '聚梦阁 15 号公寓', slots: 8 },
        { name: '罗克福德车道南段 0325 号', slots: 8 },
        { name: '莫米尔顿车道南段 0504 号', slots: 8 },
        { name: '米尔顿路 0184 号 13 号公寓', slots: 8 },
        { name: '海湾城市大街 0115 号 45 号公寓', slots: 8 }
      ],
      'low-end': [
        { name: '葡萄籽大街 1893 号', slots: 3 },
        { name: '桑库多大街 140 号', slots: 3 },
        { name: '佩立托大道 0232 号', slots: 3 },
        { name: '罗克福德车道南段 0112 号 13 号公寓', slots: 3 },
        { name: '威斯普奇大道 2057 号 1 号公寓', slots: 3 },
        { name: '佩罗大道 1115 号 18 号公寓', slots: 3 },
        { name: '圣维塔斯街 1561 号 2 号公寓', slots: 3 },
        { name: '繁荣街 1237 号 21 号公寓', slots: 3 },
        { name: '美洲狮大街 0069 号 19 号公寓', slots: 3 },
        { name: '拉斯拉古纳斯大道 2143 号 9 号公寓', slots: 3 }
      ],
      'standalone': [
        { name: '流行街 124 单元', slots: 3 },
        { name: '斯卓贝利大街 1 号', slots: 3 },
        { name: '佩立托大道 142 号', slots: 3 },
        { name: '葡萄籽大街 1932 号', slots: 3 },
        { name: '68 号公路 1200 号', slots: 3 },
        { name: '68 号公路 197 号', slots: 3 },
        { name: '罗伊洛文斯坦大道 0754 号', slots: 3 },
        { name: '大洋高速公路 2000 号', slots: 3 },
        { name: '塞诺拉公路 1920 号', slots: 3 },
        { name: '大角羊羔大街 12 号', slots: 3 },
        { name: '佩罗大道 634 号', slots: 3 },
        { name: '纯真大道车库', slots: 3 },
        { name: '米罗公园大道 0897 号', slots: 3 },
        { name: '68 号公路引道 870 号', slots: 8 },
        { name: '68 号公路 8754 号', slots: 8 },
        { name: '干船坞街 4531 号', slots: 8 },
        { name: '奥林匹克高速公路 1 单元', slots: 8 },
        { name: '戴维斯大街 0432 号', slots: 8 },
        { name: '戴维斯大街 1905 号', slots: 8 },
        { name: '流行街 14 单元', slots: 8 },
        { name: '罗伊洛文斯坦大道 0552 号', slots: 8 },
        { name: '南混乱街 1623 号', slots: 13 },
        { name: '天龙小道 1337 号', slots: 13 },
        { name: '格林威治公园道 76 单元', slots: 13 },
        { name: '补给街 331 号', slots: 13 },
        { name: '流行街 2 单元', slots: 13 },
        { name: '穆列塔高地 0120 号', slots: 13 }
      ]
    },
    'ceo-office': [
      { name: '花园银行西岸', slots: 60 },
      { name: '阿卡狄奥斯商业中心', slots: 60 },
      { name: '隆班银行西', slots: 60 },
      { name: '花园银行塔', slots: 60 }
    ],
    'nightclub': [
      { name: '好麦坞市区夜总会', slots: 35 },
      { name: '密申罗夜总会', slots: 35 },
      { name: '梅萨夜总会', slots: 35 },
      { name: '斯卓贝利夜总会', slots: 35 },
      { name: '威斯普奇运河夜总会', slots: 35 },
      { name: '柏树公寓夜总会', slots: 35 },
      { name: '天堂岛夜总会', slots: 35 },
      { name: '洛圣都国际机场夜总会', slots: 35 },
      { name: '佩罗夜总会', slots: 35 },
      { name: '西好麦坞夜总会', slots: 35 }
    ],
    'arena-workshop': [
      { name: '花园银行竞技场工作室', slots: 30 }
    ],
    'eclipse-garage': [
      { name: '日蚀大道车库', slots: 50 }
    ],
    'vinewood-club': [
      { name: '好麦坞车友俱乐部车库', slots: 100 }
    ],
    'clubhouse': [
      { name: '大灌丛会所', slots: 10 },
      { name: '沙滩海岸会所', slots: 10 },
      { name: '葡萄籽会所', slots: 10 },
      { name: '佩立托湾会所', slots: 10 },
      { name: '佩罗海滩会所', slots: 10 },
      { name: '威斯普奇海滩会所', slots: 10 },
      { name: '蓝丘会所', slots: 10 },
      { name: '梅萨会所', slots: 10 },
      { name: '圆堡山会所', slots: 10 },
      { name: '好麦坞市区会所', slots: 10 },
      { name: '霍伊克会所', slots: 10 }
    ],
    'facility': [
      { name: '佩立托湾设施', slots: 12 },
      { name: '戈多山设施', slots: 12 },
      { name: '桑库多湖设施', slots: 12 },
      { name: '荣恩风力发电场设施', slots: 12 },
      { name: '桑库多河设施', slots: 12 },
      { name: '68 号公路设施', slots: 12 },
      { name: '塞诺拉大沙漠设施', slots: 12 },
      { name: '沙滩海岸设施', slots: 12 },
      { name: '兰艾水库设施', slots: 12 }
    ],
    'penthouse': [
      { name: '赌场空中别墅', slots: 10 }
    ],
    'arcade': [
      { name: '像素彼得 - 佩立托湾', slots: 10 },
      { name: '奇迹神所 - 葡萄籽', slots: 10 },
      { name: '仓库 - 戴维斯', slots: 10 },
      { name: '八位元 - 好麦坞', slots: 10 },
      { name: '请投币 - 罗克福德山', slots: 10 },
      { name: '游戏末日 - 梅萨', slots: 10 }
    ],
    'auto-shop': [
      { name: '伯顿改装铺', slots: 10 },
      { name: '梅萨改装铺', slots: 10 },
      { name: '密申罗改装铺', slots: 10 },
      { name: '蓝丘改装铺', slots: 10 },
      { name: '斯卓贝利改装铺', slots: 10 }
    ],
    'agency': [
      { name: '威斯普奇运河', slots: 20 },
      { name: '小首尔', slots: 20 },
      { name: '霍伊克', slots: 20 },
      { name: '罗克福德山', slots: 20 }
    ],
    'bail-office': [
      { name: '密申罗保金办公室', slots: 3 },
      { name: '好麦坞市区保金办公室', slots: 3 },
      { name: '佩罗保金办公室', slots: 3 },
      { name: '戴维斯保金办公室', slots: 3 },
      { name: '佩立托湾保金办公室', slots: 3 }
    ],
    'darnell-factory': [
      { name: '达内尔兄弟服装厂', slots: 10 }
    ],
    'mansion': [
      { name: '通瓦房产', slots: 20 },
      { name: '里奇曼别墅', slots: 20 },
      { name: '好麦坞宅邸', slots: 20 }
    ],
    'vehicle-warehouse': [
      { name: '戴维斯载具仓库', slots: 8 },
      { name: '梅萨载具仓库', slots: 8 },
      { name: '布罗高地载具仓库', slots: 8 },
      { name: '天堂岛载具仓库', slots: 8 },
      { name: '洛圣都国际机场载具仓库', slots: 8 }
    ],
    'acid-lab': [
      { name: '致幻剂实验室', slots: 1 }
    ],
    'avenger': [
      { name: '复仇者', slots: 1 }
    ],
    'kosatka': [
      { name: '虎鲸', slots: 3 }
    ],
    'terabyte': [
      { name: '恐霸', slots: 1 }
    ],
    'moc': [
      { name: '机动作战中心', slots: 1 }
    ],
    'hangar': [
      { name: '洛圣都国际机场机库 1', slots: 35 },
      { name: '洛圣都国际机场机库 A17', slots: 35 },
      { name: '桑库多堡垒机库 A2', slots: 35 },
      { name: '桑库多堡垒机库 3497', slots: 35 },
      { name: '桑库多堡垒机库 3499', slots: 35 }
    ],
    'pegasus': [
      { name: '帕加索斯', slots: 1000 }
    ],
    'freakshop': [
      { name: '怪胎店', slots: 2 }
    ],
    'bunker': [
      { name: '佩立托森林', slots: 3 },
      { name: '雷通峡谷', slots: 3 },
      { name: '桑库多', slots: 3 },
      { name: '丘马什', slots: 3 },
      { name: '葡萄籽', slots: 3 },
      { name: '68 号公路', slots: 3 },
      { name: '塞诺拉大油田', slots: 3 },
      { name: '塞诺拉大沙漠', slots: 3 },
      { name: '黄栌路', slots: 3 },
      { name: '汤姆森废车场', slots: 3 },
      { name: '农舍', slots: 3 }
    ]
  };

  // ==================== CATEGORY ORDER ====================

  var CATEGORY_ORDER = [
    '公寓/车库', '多层车库', '单层车库', '豪宅',
    '特殊载具仓库', '服务载具', '机库/天马', '其他资产',
    '已导入', '扫描导入', '已迁移'
  ];

  var CATEGORY_ICONS = {
    '公寓/车库': '',
    '多层车库': '',
    '单层车库': '',
    '豪宅': '',
    '特殊载具仓库': '',
    '服务载具': '',
    '机库/天马': '',
    '其他资产': '',
    '已导入': '',
    '扫描导入': '',
    '已迁移': ''
  };

  // ==================== PUBLIC API ====================

  function init(params) {
    GTA.log('[Garage] Init');
    isManageView = false;
    loadGarages().then(function () {
      // Default: show vehicle grid of first enabled garage
      var enabledGarages = garages.filter(function (g) { return g.enabled; });
      if (enabledGarages.length === 0) {
        // No enabled garages — show management view
        showManageView();
        return;
      }
      if (params && params.id) {
        var gid = parseInt(params.id);
        var found = enabledGarages.find(function (g) { return g.id === gid; });
        if (found) currentGarageId = gid;
      }
      if (!currentGarageId) currentGarageId = enabledGarages[0].id;
      showVehicleView();
    });
    bindEvents();
  }

  function destroy() {
    isManageView = false;
    currentGarageId = null;
    var dd = document.querySelector('.location-dropdown');
    if (dd) dd.remove();
  }

  // ==================== DATA LOADING ====================

  async function loadGarages() {
    await GTA.db.ready();
    garages = await GTA.db.garages.orderBy('sortOrder').toArray();

    if (garages.length === 0) {
      await initDefaultSlots();
      garages = await GTA.db.garages.orderBy('sortOrder').toArray();
    } else {
      // Migrations
      var hasOldFormat = garages.some(function (g) { return g.slotIndex === undefined; });
      if (hasOldFormat) {
        await migrateOldData();
        garages = await GTA.db.garages.orderBy('sortOrder').toArray();
      }
      var hasV2Format = garages.some(function (g) { return g.floors === undefined && g.slotIndex !== undefined; });
      if (hasV2Format) {
        await migrateV2toV3();
        garages = await GTA.db.garages.orderBy('sortOrder').toArray();
      }
    }
    // Always ensure preset slots exist (important after import/clear)
    await ensureAllSlotsExist();
    garages = await GTA.db.garages.orderBy('sortOrder').toArray();
  }

  async function initDefaultSlots() {
    var sortOrder = 0;
    for (var c = 0; c < CATEGORY_ORDER.length; c++) {
      var cat = CATEGORY_ORDER[c];
      var slots = PROPERTY_SLOTS.filter(function (s) { return s.category === cat; });
      for (var i = 0; i < slots.length; i++) {
        var slot = slots[i];
        await GTA.db.garages.add({
          slotIndex: slot.slotIndex,
          enabled: false,
          propertyName: slot.name,
          propertyCategory: slot.category,
          propertyType: slot.type,
          slotCount: 0,
          floors: slot.floors || 1,
          location: null,
          sortOrder: sortOrder,
          createdAt: Date.now()
        });
        sortOrder++;
      }
    }
    GTA.log('[Garage] Initialized ' + sortOrder + ' property slots');
  }

  async function migrateOldData() {
    GTA.log('[Garage] Migrating old garage data...');
    var oldGarages = garages.filter(function (g) { return g.slotIndex === undefined; });
    for (var i = 0; i < oldGarages.length; i++) {
      var g = oldGarages[i];
      await GTA.db.garages.update(g.id, {
        slotIndex: i,
        enabled: true,
        propertyName: g.name || '已迁移车库 ' + (i + 1),
        propertyCategory: '已迁移',
        propertyType: 'legacy',
        slotCount: 10,
        floors: 1,
        floor: 1,
        location: g.name || '已迁移车库'
      });
    }
  }

  async function migrateV2toV3() {
    GTA.log('[Garage] Migrating v2→v3: merging multi-slot types into single slots...');
    // Types that changed from multiple slots to single slot
    var mergedTypes = ['clubhouse','facility','arcade','auto-shop','agency','bail-office','bunker','hangar','vehicle-warehouse'];
    // Multi-floor types that changed from N separate cards to 1 card with floors
    var floorTypes = ['ceo-office','nightclub','arena-workshop','vinewood-club'];

    var allToMerge = mergedTypes.concat(floorTypes);

    for (var t = 0; t < allToMerge.length; t++) {
      var targetType = allToMerge[t];
      var typeRecords = garages.filter(function (g) { return g.propertyType === targetType; });
      if (typeRecords.length <= 1) continue;

      // Sort by slotIndex
      typeRecords.sort(function (a, b) { return (a.slotIndex || 0) - (b.slotIndex || 0); });

      // Keep the first record (slotIndex=0), merge vehicles into it
      var keeper = typeRecords[0];
      var orphans = typeRecords.slice(1);

      // Collect vehicles from orphaned records
      for (var o = 0; o < orphans.length; o++) {
        var orphan = orphans[o];
        if (!orphan.enabled) {
          // Just delete disabled orphans
          await GTA.db.garages.delete(orphan.id);
          continue;
        }

        // Move vehicles from orphan to keeper
        var orphanVehicles = await GTA.db.garageVehicles.where('garageId').equals(orphan.id).toArray();
        if (orphanVehicles.length > 0) {
          // Get max sortOrder from keeper
          var keeperVehicles = await GTA.db.garageVehicles.where('garageId').equals(keeper.id).toArray();
          var maxSort = keeperVehicles.length > 0
            ? Math.max.apply(null, keeperVehicles.map(function (r) { return r.sortOrder || 0; }))
            : -1;

          for (var v = 0; v < orphanVehicles.length; v++) {
            await GTA.db.garageVehicles.update(orphanVehicles[v].id, {
              garageId: keeper.id,
              sortOrder: maxSort + 1 + v
            });
          }
        }

        // If keeper wasn't enabled but orphan was, adopt orphan's config
        if (!keeper.enabled && orphan.enabled) {
          await GTA.db.garages.update(keeper.id, {
            enabled: orphan.enabled,
            location: orphan.location,
            slotCount: orphan.slotCount
          });
        }

        // Delete orphan record
        await GTA.db.garages.delete(orphan.id);
      }

      // Set floors/floor on keeper if missing
      if (keeper.floors === undefined) {
        var preset = getPresetForGarage(keeper);
        var floors = (preset && preset.floors) ? preset.floors : 1;
        await GTA.db.garages.update(keeper.id, { floors: floors, floor: 1 });
      }
    }

    // Also update any remaining records that are missing floors/floor
    for (var i = 0; i < garages.length; i++) {
      var g = garages[i];
      if (g.floors === undefined && g.slotIndex !== undefined) {
        var p = getPresetForGarage(g);
        var f = (p && p.floors) ? p.floors : 1;
        await GTA.db.garages.update(g.id, { floors: f, floor: 1 });
      }
    }

    GTA.log('[Garage] v2→v3 migration complete');
  }

  async function ensureAllSlotsExist() {
    // Ensure all preset slots have DB records
    for (var c = 0; c < CATEGORY_ORDER.length; c++) {
      var cat = CATEGORY_ORDER[c];
      var slots = PROPERTY_SLOTS.filter(function (s) { return s.category === cat; });
      for (var i = 0; i < slots.length; i++) {
        var slot = slots[i];
        var exists = garages.some(function (g) {
          return g.propertyCategory === slot.category &&
                 g.propertyType === slot.type &&
                 g.slotIndex === slot.slotIndex;
        });
        if (!exists) {
          var maxSort = garages.length > 0
            ? Math.max.apply(null, garages.map(function (g) { return g.sortOrder || 0; }))
            : -1;
          await GTA.db.garages.add({
            slotIndex: slot.slotIndex,
            enabled: false,
            propertyName: slot.name,
            propertyCategory: slot.category,
            propertyType: slot.type,
            slotCount: 0,
            floors: slot.floors || 1,
            floor: 1,
            location: null,
            sortOrder: maxSort + 1,
            createdAt: Date.now()
          });
        }
      }
    }
  }

  // ==================== PROPERTY CARDS ====================

  function renderPropertyCards() {
    var grid = document.getElementById('property-cards-grid');
    if (!grid) return;

    // Build a map: category -> garages
    var catMap = {};
    for (var i = 0; i < CATEGORY_ORDER.length; i++) {
      catMap[CATEGORY_ORDER[i]] = [];
    }
    for (var j = 0; j < garages.length; j++) {
      var g = garages[j];
      if (g.propertyCategory && catMap.hasOwnProperty(g.propertyCategory)) {
        catMap[g.propertyCategory].push(g);
      }
    }

    var html = '';

    for (var c = 0; c < CATEGORY_ORDER.length; c++) {
      var cat = CATEGORY_ORDER[c];
      var catGarages = catMap[cat] || [];
      if (catGarages.length === 0) continue;

      var enabledCount = catGarages.filter(function (g) { return g.enabled; }).length;
      var isCollapsed = collapsedCategories[cat] || false;

      html += '<div class="property-category-header' + (isCollapsed ? ' collapsed' : '') + '" data-category="' + Utils.escapeHtml(cat) + '">';
      html += '<span class="cat-chevron">▶</span>';
      if (CATEGORY_ICONS[cat]) html += '<span class="cat-icon">' + CATEGORY_ICONS[cat] + '</span>';
      html += '<span class="cat-label">' + Utils.escapeHtml(cat) + '</span>';
      html += '<span class="cat-divider"></span>';
      html += '<span class="cat-count">' + enabledCount + '/' + catGarages.length + ' 已拥有</span>';
      html += '</div>';

      if (!isCollapsed) {
        for (var k = 0; k < catGarages.length; k++) {
          html += renderPropertyCard(catGarages[k]);
        }
      }
    }

    if (!html) {
      grid.innerHTML = '<div class="property-no-results">没有匹配的资产位</div>';
      return;
    }

    grid.innerHTML = html;

    // Bind category header clicks
    grid.querySelectorAll('.property-category-header').forEach(function (header) {
      header.addEventListener('click', function () {
        var cat = this.getAttribute('data-category');
        collapsedCategories[cat] = !collapsedCategories[cat];
        renderPropertyCards();
      });
    });

    // Bind card button clicks
    grid.querySelectorAll('.property-card .card-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var gid = parseInt(this.getAttribute('data-gid'));
        var g = garages.find(function (x) { return x.id === gid; });
        if (g) showPropertyConfig(g);
      });
    });
  }

  function renderPropertyCard(g) {
    var enabled = g.enabled;
    var hasLocation = enabled && g.location;
    var slotCount = g.slotCount || 0;
    var preset = getPresetForGarage(g);

    // Count vehicles in this garage
    var vehicleCount = g._count !== undefined ? g._count : 0;

    var cls = 'property-card' + (enabled ? ' enabled' : '');
    var badgeCls = enabled ? 'card-badge owned' : 'card-badge';
    var badgeText = enabled ? '已拥有' : '未拥有';
    var locationText = hasLocation ? g.location : '-';
    var capacityText = slotCount > 0 ? formatSlotCapacity(slotCount) : '-';
    var btnText = enabled ? '配置信息' : '启用资产';

    return '<div class="' + cls + '">' +
      '<div class="card-glow"></div>' +
      '<div class="card-body">' +
        '<div class="card-header">' +
          '<div class="card-icon-wrap">' +
            '<div>' +
              '<div class="card-title">' + Utils.escapeHtml(g.propertyName || '未命名') + '</div>' +
              '<div class="' + badgeCls + '">' + badgeText + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="card-info">' +
          '<div class="card-info-row"><span class="info-label">位置</span><span class="info-value">' + Utils.escapeHtml(locationText) + '</span></div>' +
          '<div class="card-info-row"><span class="info-label">容量</span><span class="info-value">' + Utils.escapeHtml(capacityText) + '</span></div>' +
        '</div>' +
        '<div class="card-actions">' +
          '<button class="card-btn" data-gid="' + g.id + '">' + btnText + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function getPresetForGarage(g) {
    // Find matching preset by category + type (each type has 1 preset, except apartments)
    for (var i = 0; i < PROPERTY_SLOTS.length; i++) {
      var p = PROPERTY_SLOTS[i];
      if (p.category === g.propertyCategory && p.type === g.propertyType && p.slotIndex === g.slotIndex) {
        return p;
      }
    }
    return null;
  }

  function formatSlotCapacity(count) {
    if (count >= 100) return count + ' 车位';
    if (count >= 13) return count + ' 车位';
    if (count === 8) return '6+2 车位';
    if (count === 13) return '10+3 车位';
    if (count === 3) return '2+1 车位';
    return count + ' 车位';
  }

  // ==================== MATCH MODAL (imported garages) ====================

  function showMatchModal(garage) {
    // Build ALL locations for matching
    var allOptions = [];
    var allTypeKeys = Object.keys(PROPERTY_LOCATIONS);
    for (var ak = 0; ak < allTypeKeys.length; ak++) {
      var akData = PROPERTY_LOCATIONS[allTypeKeys[ak]];
      if (Array.isArray(akData)) {
        for (var aj = 0; aj < akData.length; aj++) { allOptions.push({ loc: akData[aj], matchType: allTypeKeys[ak] }); }
      } else {
        var subKeys = Object.keys(akData);
        for (var si = 0; si < subKeys.length; si++) {
          var items = akData[subKeys[si]];
          for (var sj = 0; sj < items.length; sj++) { allOptions.push({ loc: items[sj], matchType: allTypeKeys[ak] }); }
        }
      }
    }

    // Count used locations (per floor capacity)
    var usedCount = {};
    garages.forEach(function (g2) {
      if (g2.id !== garage.id && g2.enabled && g2.location) {
        usedCount[g2.location] = (usedCount[g2.location] || 0) + 1;
      }
    });

    // Build dropdown
    var locHtml = '<div style="position:sticky;top:0;z-index:1;padding:8px;background:rgba(19,19,19,0.99);border-bottom:1px solid rgba(255,255,255,0.06);">' +
      '<input type="text" class="form-input" id="match-search-input" placeholder="搜索位置..." style="width:100%;padding:6px 10px;font-size:12px;border-radius:6px;background:rgba(255,255,255,0.04);border:none;color:#e8e8e8;">' +
    '</div><div id="match-location-items">';
    for (var d = 0; d < allOptions.length; d++) {
      var opt = allOptions[d]; var loc = opt.loc;
      var useCount = usedCount[loc.name] || 0;
      var maxFloors = getFloorsCountForType(opt.matchType);
      var isFull = useCount >= maxFloors;
      locHtml += '<div class="location-dropdown-item match-option' + (isFull ? ' used' : '') + '" data-loc="' + Utils.escapeHtml(loc.name) +
        '" data-slots="' + loc.slots + '" data-match-type="' + opt.matchType +
        '" style="' + (isFull ? 'opacity:0.35;pointer-events:none;' : '') + '" data-search="' + Utils.escapeHtml(loc.name.toLowerCase()) + '">' +
        '<span>' + Utils.escapeHtml(loc.name) + '</span>' +
        '<span class="loc-slots">' + (isFull ? '已满(' + useCount + '/' + maxFloors + ')' : (useCount > 0 ? '已用' + useCount + '/' + maxFloors + '层 · ' + formatSlotCapacity(loc.slots) : formatSlotCapacity(loc.slots))) + '</span></div>';
    }
    locHtml += '</div>';

    var bodyHtml =
      '<div class="config-section">' +
        '<label class="config-section-label">选择位置 <span class="required">*</span></label>' +
        '<div class="location-selector" style="position:relative;">' +
          '<div class="location-dropdown" id="match-location-dropdown" style="position:relative;display:block;max-height:300px;overflow-y:auto;border:1px solid rgba(255,255,255,0.06);border-radius:8px;">' + locHtml + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="config-section" id="match-floor-section" style="display:none;">' +
        '<label class="config-section-label">选择楼层</label>' +
        '<div class="location-selector" id="match-floor-selector">' +
          '<div class="location-select-trigger" id="match-floor-trigger"><span id="match-floor-text">第 1 层</span><span class="chevron">▾</span></div>' +
          '<div class="location-dropdown" id="match-floor-dropdown" style="display:none;"></div>' +
        '</div>' +
      '</div>';

    GTA.Modal.show({
      title: (garage.propertyName || '资产') + ' — 匹配位置',
      body: bodyHtml,
      confirmText: '确定位置',
      cancelText: '取消',
      onConfirm: async function () {
        var selEl = document.querySelector('.match-option.selected');
        var selLoc = selEl ? selEl.getAttribute('data-loc') : null;
        if (!selLoc) { GTA.Toast.warning('请选择位置'); return; }
        var selSlots = parseInt(selEl.getAttribute('data-slots'));
        var selMatchType = selEl.getAttribute('data-match-type');

        // Get selected floor
        var selFloor = 1;
        var floorSel = document.querySelector('#match-floor-dropdown .location-dropdown-item.selected');
        if (floorSel) selFloor = parseInt(floorSel.getAttribute('data-floor'));

        // Find matching preset for floors
        var finalFloors = 1;
        var ps = PROPERTY_SLOTS.filter(function(s) { return s.type === selMatchType; });
        if (ps.length > 0) finalFloors = ps[0].floors || 1;

        // Find target: existing enabled slot with same location, or an unused preset
        var target = null;
        var existingSlots = garages.filter(function (g2) {
          return g2.id !== garage.id && g2.enabled && g2.location === selLoc && g2.propertyType === selMatchType;
        });
        if (existingSlots.length > 0) {
          target = existingSlots[0]; // Same location, merge into different floor
        } else {
          var unusedSlots = garages.filter(function (g2) {
            return g2.id !== garage.id && g2.propertyType === selMatchType && !g2.enabled;
          });
          if (unusedSlots.length > 0) target = unusedSlots[0];
        }

        if (target) {
          // Enable preset if needed + set location
          var targetUpdate = { enabled: true, location: selLoc, slotCount: selSlots, floors: finalFloors };
          if (!target.enabled) { await GTA.db.garages.update(target.id, targetUpdate); }

          // Calculate floor offset for vehicle sortOrder
          var perFloor = Math.floor(selSlots / (Array.isArray(finalFloors) ? finalFloors.length : finalFloors));
          var floorOffset = (selFloor - 1) * perFloor;

          // Move vehicles — place at floor-relative positions
          var myVehicles = await GTA.db.garageVehicles.where('garageId').equals(garage.id).toArray();
          var floorVehicles = (await GTA.db.garageVehicles.where('garageId').equals(target.id).toArray())
            .filter(function(r) { var s = r.sortOrder || 0; return s >= floorOffset && s < floorOffset + perFloor; });
          var maxSlotInFloor = floorVehicles.length > 0
            ? Math.max.apply(null, floorVehicles.map(function(r) { return r.sortOrder || 0; })) : (floorOffset - 1);
          for (var mv = 0; mv < myVehicles.length; mv++) {
            await GTA.db.garageVehicles.update(myVehicles[mv].id, { garageId: target.id, sortOrder: maxSlotInFloor + 1 + mv });
          }
          await GTA.db.garages.delete(garage.id);
          GTA.Toast.success('已融合到「' + (target.location || target.propertyName) + '」第' + selFloor + '层');
        } else {
          var updateData = { enabled: true, location: selLoc, slotCount: selSlots, floors: finalFloors, floor: selFloor };
          var catSlots = PROPERTY_SLOTS.filter(function(s) { return s.type === selMatchType && s.category !== '已导入' && s.category !== '扫描导入'; });
          if (catSlots.length > 0) { updateData.propertyCategory = catSlots[0].category; updateData.propertyType = selMatchType; }
          await GTA.db.garages.update(garage.id, updateData);
          GTA.Toast.success('已匹配到「' + selLoc + '」');
        }

        await loadGarages();
        renderPropertyCards();
        GTA.Modal.hide();
      },
      onShow: function () {
        var dropdown = document.getElementById('match-location-dropdown');
        var searchInput = document.getElementById('match-search-input');
        var floorSection = document.getElementById('match-floor-section');
        var floorTrigger = document.getElementById('match-floor-trigger');
        var floorDropdown = document.getElementById('match-floor-dropdown');

        // Search filter
        if (searchInput) {
          searchInput.addEventListener('input', function () {
            var q = this.value.toLowerCase();
            dropdown.querySelectorAll('.match-option').forEach(function (item) {
              var txt = item.getAttribute('data-search') || '';
              item.style.display = (!q || txt.indexOf(q) >= 0) ? '' : 'none';
            });
          });
        }

        // Location click → select + show floor if multi
        dropdown.querySelectorAll('.match-option:not(.used)').forEach(function (item) {
          item.addEventListener('click', function () {
            dropdown.querySelectorAll('.match-option').forEach(function (x) { x.classList.remove('selected'); });
            this.classList.add('selected');
            var matchType = this.getAttribute('data-match-type');
            var locSlots = parseInt(this.getAttribute('data-slots'));
            // Update floor selector
            if (matchType) {
              var ps2 = PROPERTY_SLOTS.filter(function(s) { return s.type === matchType; });
              var presetFloors = (ps2.length > 0 && ps2[0].floors) ? ps2[0].floors : [];
              if (Array.isArray(presetFloors) && presetFloors.length > 1) {
                floorSection.style.display = '';
                document.getElementById('match-floor-text').textContent = presetFloors[0].name + ' (' + presetFloors[0].slots + '车位)';
                var fiHtml = '';
                for (var fi = 0; fi < presetFloors.length; fi++) {
                  fiHtml += '<div class="location-dropdown-item' + (fi === 0 ? ' selected' : '') + '" data-floor="' + (fi + 1) + '">' +
                    '<span>' + Utils.escapeHtml(presetFloors[fi].name) + '</span><span class="loc-slots">' + presetFloors[fi].slots + ' 车位</span></div>';
                }
                floorDropdown.innerHTML = fiHtml;
              } else { floorSection.style.display = 'none'; }
            }
          });
        });

        // Floor trigger
        if (floorTrigger && floorDropdown) {
          floorTrigger.addEventListener('click', function (e) {
            e.stopPropagation();
            var isOpen = floorDropdown.style.display === 'block';
            floorDropdown.style.display = isOpen ? 'none' : 'block';
          });
          // Floor items
          floorDropdown.addEventListener('click', function (e) {
            var fi = e.target.closest('.location-dropdown-item');
            if (fi) {
              floorDropdown.querySelectorAll('.location-dropdown-item').forEach(function(x) { x.classList.remove('selected'); });
              fi.classList.add('selected');
              document.getElementById('match-floor-text').textContent = '第 ' + fi.getAttribute('data-floor') + ' 层';
              floorDropdown.style.display = 'none';
            }
          });
          document.addEventListener('click', function (e) {
            if (!e.target.closest('#match-floor-selector')) floorDropdown.style.display = 'none';
          });
        }
      }
    });
  }

  // ==================== CONFIG MODAL (preset garages) ====================

  function showPropertyConfig(garage) {
    var propType = garage.propertyType || 'apartment';
    var isImportType = (propType === 'imported' || propType === 'scanned' || propType === 'legacy');
    if (isImportType) { showMatchModal(garage); return; }

    var preset = getPresetForGarage(garage);
    var hasLocation = garage.enabled && garage.location;
    var enabled = garage.enabled;

    // ---- Build location options ----
    var locationOptions = [];
    if (isImportType) {
      // Show ALL locations for matching
      var allTypeKeys = Object.keys(PROPERTY_LOCATIONS);
      for (var ak = 0; ak < allTypeKeys.length; ak++) {
        var akData = PROPERTY_LOCATIONS[allTypeKeys[ak]];
        if (Array.isArray(akData)) {
          for (var aj = 0; aj < akData.length; aj++) {
            locationOptions.push({ loc: akData[aj], matchType: allTypeKeys[ak] });
          }
        } else {
          var subKeys = Object.keys(akData);
          for (var si = 0; si < subKeys.length; si++) {
            var items = akData[subKeys[si]];
            for (var sj = 0; sj < items.length; sj++) {
              locationOptions.push({ loc: items[sj], matchType: allTypeKeys[ak] });
            }
          }
        }
      }
    } else {
      var locData = PROPERTY_LOCATIONS[propType];
      if (locData) {
        var items2 = Array.isArray(locData) ? locData : [];
        if (!Array.isArray(locData)) {
          var sk = Object.keys(locData);
          for (var ski = 0; ski < sk.length; ski++) { items2 = items2.concat(locData[sk[ski]]); }
        }
        for (var mi = 0; mi < items2.length; mi++) { locationOptions.push({ loc: items2[mi], matchType: '' }); }
      }
    }

    // ---- Count used locations (per floor capacity) ----
    var usedCount2 = {};
    garages.forEach(function (g2) {
      if (g2.id !== garage.id && g2.enabled && g2.location) {
        usedCount2[g2.location] = (usedCount2[g2.location] || 0) + 1;
      }
    });

    // ---- Build dropdown HTML ----
    var dropdownHtml = '<div style="position:sticky;top:0;z-index:1;padding:8px;background:rgba(19,19,19,0.99);border-bottom:1px solid rgba(255,255,255,0.06);">' +
      '<input type="text" class="form-input" id="location-search-input" placeholder="搜索位置..." style="width:100%;padding:6px 10px;font-size:12px;border-radius:6px;background:rgba(255,255,255,0.04);border:none;color:#e8e8e8;">' +
    '</div><div id="location-dropdown-items">';
    for (var d = 0; d < locationOptions.length; d++) {
      var opt = locationOptions[d];
      var loc = opt.loc;
      var useCount = usedCount2[loc.name] || 0;
      var maxFloors = getFloorsCountForType(opt.matchType || propType);
      var isFull = useCount >= maxFloors;
      var sel = garage.location === loc.name ? ' selected' : '';
      if (isFull) {
        dropdownHtml += '<div class="location-dropdown-item loc-option used" data-loc="' + Utils.escapeHtml(loc.name) + '" data-slots="' + loc.slots + '" style="opacity:0.35;pointer-events:none;" data-search="' + Utils.escapeHtml(loc.name.toLowerCase()) + '">' +
          '<span>' + Utils.escapeHtml(loc.name) + '</span>' +
          '<span class="loc-slots" style="color:var(--color-danger);">已满</span></div>';
      } else {
        dropdownHtml += '<div class="location-dropdown-item loc-option' + sel + '" data-loc="' + Utils.escapeHtml(loc.name) + '" data-slots="' + loc.slots + '"' +
          (opt.matchType ? ' data-match-type="' + opt.matchType + '"' : '') +
          ' data-search="' + Utils.escapeHtml(loc.name.toLowerCase()) + '">' +
          '<span>' + Utils.escapeHtml(loc.name) + '</span>' +
          '<span class="loc-slots">' + (useCount > 0 ? '已用' + useCount + '/' + maxFloors + '层 · ' : '') + formatSlotCapacity(loc.slots) + '</span></div>';
      }
    }
    dropdownHtml += '</div>';

    // ---- Floor selector ----
    var floorData2 = getFloors(garage);
    var curFloor = garage.floor || 1;
    var floorHtml = '';
    if (floorData2.length > 1) {
      floorHtml = '<div class="config-section' + (enabled ? '' : ' disabled') + '" id="config-floor-section">' +
        '<label class="config-section-label">选择楼层</label>' +
        '<div class="location-selector" id="floor-selector">' +
          '<div class="location-select-trigger" id="floor-trigger"><span id="floor-selected-text">' + Utils.escapeHtml(floorData2[Math.min(curFloor - 1, floorData2.length - 1)].name) + '</span><span class="chevron">▾</span></div>' +
          '<div class="location-dropdown" id="floor-dropdown" style="display:none;">';
      for (var fl = 0; fl < floorData2.length; fl++) {
        floorHtml += '<div class="location-dropdown-item' + ((fl + 1) === curFloor ? ' selected' : '') + '" data-floor="' + (fl + 1) + '"><span>' + Utils.escapeHtml(floorData2[fl].name) + '</span><span class="loc-slots">' + floorData2[fl].slots + ' 车位</span></div>';
      }
      floorHtml += '</div></div></div>';
    }

    // ---- Assemble modal body ----
    var curSlots = garage.slotCount || 0;
    var selectedText = hasLocation ? garage.location : '请选择位置';
    var bodyHtml =
      '<div class="config-toggle-row">' +
        '<div class="config-toggle-label"><span class="toggle-title">启用此车库</span><span class="toggle-status">当前状态：' + (enabled ? '已启用' : '未启用') + '</span></div>' +
        '<div class="toggle-switch' + (enabled ? ' on' : '') + '" id="config-toggle"><div class="toggle-knob"></div></div>' +
      '</div>' +
      '<div class="config-section' + (enabled ? '' : ' disabled') + '" id="config-location-section">' +
        '<label class="config-section-label">选择位置 <span class="required">*</span></label>' +
        '<div class="location-selector" id="location-selector">' +
          '<div class="location-select-trigger" id="location-trigger"><span class="' + (hasLocation ? '' : 'placeholder') + '" id="location-selected-text">' + Utils.escapeHtml(selectedText) + '</span><span class="chevron">▾</span></div>' +
          '<div class="location-dropdown" id="location-dropdown" style="display:none;">' + dropdownHtml + '</div>' +
        '</div>' +
      '</div>' +
      floorHtml +
      '<div class="config-section"><label class="config-section-label">容量</label><p style="font-size:var(--font-size-caption);color:var(--color-gold);margin:0;" id="config-capacity">' + (curSlots > 0 ? formatSlotCapacity(curSlots) : '-') + '</p></div>';

    GTA.Modal.show({
      title: (garage.propertyName || '资产') + ' — 配置',
      body: bodyHtml,
      confirmText: enabled && hasLocation ? '进入车位配置 →' : '保存',
      cancelText: '关闭',
      onConfirm: async function () {
        var isEnabled = document.getElementById('config-toggle').classList.contains('on');
        var selLocEl = document.querySelector('#location-dropdown .loc-option.selected');
        var selLoc = selLocEl ? selLocEl.getAttribute('data-loc') : (hasLocation ? garage.location : null);
        var selSlots = selLocEl ? parseInt(selLocEl.getAttribute('data-slots')) : curSlots;
        var selMatchType = selLocEl ? (selLocEl.getAttribute('data-match-type') || '') : '';

        if (isEnabled && !selLoc) { GTA.Toast.warning('请选择位置'); return; }

        var selFloor = 1;
        var floorEl = document.querySelector('#floor-dropdown .location-dropdown-item.selected');
        if (floorEl) selFloor = parseInt(floorEl.getAttribute('data-floor'));

        // Determine floors from matched property type
        var finalFloors = floorData2;
        if (selMatchType) {
          var ps = PROPERTY_SLOTS.filter(function(s) { return s.type === selMatchType; });
          if (ps.length > 0) finalFloors = ps[0].floors || floorData2;
        }

        var updateData = {
          enabled: isEnabled,
          location: isEnabled ? selLoc : null,
          slotCount: isEnabled ? selSlots : 0,
          floors: finalFloors,
          floor: selFloor
        };

        // Reclassify import → matched property
        if (isImportType && selMatchType && isEnabled) {
          var catSlots = PROPERTY_SLOTS.filter(function(s) { return s.type === selMatchType && s.category !== '已导入' && s.category !== '扫描导入'; });
          if (catSlots.length > 0) {
            updateData.propertyCategory = catSlots[0].category;
            updateData.propertyType = selMatchType;
          }
        }

        await GTA.db.garages.update(garage.id, updateData);
        await loadGarages();

        // If reclassifying an imported garage, check for existing garage with same location → merge
        if (isImportType && isEnabled && selLoc && selMatchType) {
          var existing = garages.filter(function (eg) {
            return eg.id !== garage.id && eg.enabled && eg.location === selLoc;
          });
          if (existing.length > 0) {
            var target = existing[0];
            var myVehicles = await GTA.db.garageVehicles.where('garageId').equals(garage.id).toArray();
            var targetVehicles = await GTA.db.garageVehicles.where('garageId').equals(target.id).toArray();
            var maxSort = targetVehicles.length > 0
              ? Math.max.apply(null, targetVehicles.map(function (r) { return r.sortOrder || 0; })) : -1;
            for (var mv = 0; mv < myVehicles.length; mv++) {
              await GTA.db.garageVehicles.update(myVehicles[mv].id, { garageId: target.id, sortOrder: maxSort + 1 + mv });
            }
            await GTA.db.garages.delete(garage.id);
            GTA.Toast.success('已融合到「' + (target.location || target.propertyName) + '」');
            await loadGarages();
            renderPropertyCards();
            GTA.Modal.hide();
            currentGarageId = target.id;
            showVehicleView();
            return;
          }
        }

        renderPropertyCards();
        if (isEnabled && selLoc) { GTA.Modal.hide(); currentGarageId = garage.id; showVehicleView(); }
      },
      onShow: function () {
        var toggle = document.getElementById('config-toggle');
        var locationSection = document.getElementById('config-location-section');
        var trigger = document.getElementById('location-trigger');
        var dropdown = document.getElementById('location-dropdown');

        // Toggle click
        if (toggle) {
          toggle.addEventListener('click', function () {
            var nowOn = !this.classList.contains('on');
            if (nowOn) {
              this.classList.add('on');
              if (locationSection) locationSection.classList.remove('disabled');
              document.querySelector('.toggle-status').textContent = '当前状态：已启用';
            } else {
              this.classList.remove('on');
              if (locationSection) locationSection.classList.add('disabled');
              document.querySelector('.toggle-status').textContent = '当前状态：未启用';
            }
          });
        }

        // Location search filter
        var searchInput = document.getElementById('location-search-input');
        if (searchInput && dropdown) {
          searchInput.addEventListener('input', function () {
            var q = this.value.toLowerCase();
            var items = dropdown.querySelectorAll('.loc-option');
            var groups = dropdown.querySelectorAll('.loc-group-header');
            items.forEach(function (item) {
              var txt = item.getAttribute('data-search') || '';
              item.style.display = (!q || txt.indexOf(q) >= 0) ? '' : 'none';
            });
            groups.forEach(function (g) { g.style.display = q ? 'none' : ''; });
          });
          searchInput.addEventListener('click', function (e) { e.stopPropagation(); });
        }

        // Location trigger
        if (trigger && dropdown) {
          trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            var isOpen = dropdown.style.display === 'block';
            if (!isOpen) {
              var triggerRect = trigger.getBoundingClientRect();
              var spaceBelow = window.innerHeight - triggerRect.bottom - 8;
              dropdown.style.maxHeight = Math.max(200, spaceBelow) + 'px';
              dropdown.style.display = 'block';
              trigger.classList.add('open');
            } else {
              dropdown.style.display = 'none';
              trigger.classList.remove('open');
            }
          });

          // Location item click — select and close
          dropdown.querySelectorAll('.loc-option:not(.used)').forEach(function (item) {
            item.addEventListener('click', function () {
              dropdown.querySelectorAll('.loc-option').forEach(function (x) { x.classList.remove('selected'); });
              this.classList.add('selected');
              var locName = this.getAttribute('data-loc');
              var locSlots = parseInt(this.getAttribute('data-slots'));
              document.getElementById('location-selected-text').textContent = locName;
              document.getElementById('location-selected-text').classList.remove('placeholder');
              document.getElementById('config-capacity').textContent = formatSlotCapacity(locSlots);

              // Update floor selector for multi-floor types
              var matchType = this.getAttribute('data-match-type');
              var floorDropdown = document.getElementById('floor-dropdown');
              var floorSection = document.getElementById('config-floor-section');
              if (matchType) {
                var ps = PROPERTY_SLOTS.filter(function(s) { return s.type === matchType; });
                var newFloors = (ps.length > 0) ? (ps[0].floors || 1) : 1;
                if (newFloors > 1 && floorDropdown && floorSection) {
                  var perFloor = Math.floor(locSlots / newFloors);
                  floorSection.style.display = '';
                  document.getElementById('floor-selected-text').textContent = '第 1 层 (' + perFloor + '车位)';
                  var fiHtml = '';
                  for (var fi = 1; fi <= newFloors; fi++) {
                    fiHtml += '<div class="location-dropdown-item' + (fi === 1 ? ' selected' : '') + '" data-floor="' + fi + '">' +
                      '<span>第 ' + fi + ' 层</span><span class="loc-slots">' + perFloor + ' 车位</span></div>';
                  }
                  floorDropdown.innerHTML = fiHtml;
                } else if (floorSection) {
                  floorSection.style.display = 'none';
                }
              }

              dropdown.style.display = 'none';
              trigger.classList.remove('open');
            });
          });

          // Close dropdown on outside click
          document.addEventListener('click', function (e) {
            if (!e.target.closest('#location-selector')) {
              dropdown.style.display = 'none';
              trigger.classList.remove('open');
            }
          }, { once: false });
        }

        // Floor selector handlers
        var floorTrigger = document.getElementById('floor-trigger');
        var floorDropdown = document.getElementById('floor-dropdown');
        if (floorTrigger && floorDropdown) {
          floorTrigger.addEventListener('click', function (e) {
            e.stopPropagation();
            var isOpen = floorDropdown.style.display === 'block';
            floorDropdown.style.display = isOpen ? 'none' : 'block';
            if (!isOpen) floorTrigger.classList.add('open'); else floorTrigger.classList.remove('open');
          });
          floorDropdown.querySelectorAll('.location-dropdown-item').forEach(function (item) {
            item.addEventListener('click', function () {
              floorDropdown.querySelectorAll('.location-dropdown-item').forEach(function (x) { x.classList.remove('selected'); });
              this.classList.add('selected');
              document.getElementById('floor-selected-text').textContent = '第 ' + this.getAttribute('data-floor') + ' 层';
              floorDropdown.style.display = 'none';
              floorTrigger.classList.remove('open');
            });
          });
          document.addEventListener('click', function (e) {
            if (!e.target.closest('#floor-selector')) {
              floorDropdown.style.display = 'none';
              floorTrigger.classList.remove('open');
            }
          }, { once: false });
        }
      }
    });
  }

  // ==================== VEHICLE SLOT GRID VIEW ====================

  function showVehicleView() {
    isManageView = false;
    document.getElementById('garage-manage-view').style.display = 'none';
    document.getElementById('garage-vehicle-view').style.display = '';
    renderVehicleNav();
    renderGarageGrid();
  }

  function showManageView() {
    isManageView = true;
    document.getElementById('garage-vehicle-view').style.display = 'none';
    document.getElementById('garage-manage-view').style.display = '';
    renderPropertyCards();
  }

  function renderVehicleNav() {
    var g = garages.find(function (x) { return x.id === currentGarageId; });
    var nameEl = document.getElementById('garage-nav-name');
    if (nameEl) {
      var title = (g && g.location) || (g && g.propertyName) || '车库';
      nameEl.textContent = title;
    }
    renderGarageDropdown();
    renderFloorTabs();
  }

  function navigateGarage(dir) {
    var enabled = garages.filter(function (g) { return g.enabled; });
    if (enabled.length === 0) return;
    var idx = -1;
    for (var i = 0; i < enabled.length; i++) {
      if (enabled[i].id === currentGarageId) { idx = i; break; }
    }
    if (idx === -1) idx = 0;
    var newIdx = (idx + dir + enabled.length) % enabled.length;
    currentGarageId = enabled[newIdx].id;
    showVehicleView();
  }

  function renderFloorTabs() {
    var g = garages.find(function (x) { return x.id === currentGarageId; });
    var floorData = getFloors(g);
    var existing = document.getElementById('floor-tabs-bar');
    if (existing) existing.remove();
    if (floorData.length <= 1) return;

    var tabsHtml = '<div class="floor-tabs-bar" id="floor-tabs-bar">';
    for (var f = 0; f < floorData.length; f++) {
      tabsHtml += '<button class="floor-tab" data-floor="' + (f + 1) + '">' + Utils.escapeHtml(floorData[f].name) + '</button>';
    }
    tabsHtml += '</div>';

    var grid = document.getElementById('garage-grid');
    if (grid && grid.parentNode) {
      grid.parentNode.insertBefore(createElementFromHtml(tabsHtml), grid);

      document.querySelectorAll('.floor-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
          var floor = this.getAttribute('data-floor');
          var header = document.getElementById('floor-' + floor);
          if (header) header.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }
  }

  // Get floors array for a garage or preset. Returns [{name, slots}, ...]
  function getFloors(g) {
    if (g && g.floors && Array.isArray(g.floors)) return g.floors;
    var preset = g ? getPresetForGarage(g) : null;
    if (preset && preset.floors && Array.isArray(preset.floors)) return preset.floors;
    // Legacy number format
    var count = (g && g.floors) || (preset && preset.floors) || 1;
    if (typeof count === 'number' && count > 1) {
      var arr = []; for (var i = 1; i <= count; i++) arr.push({ name: '第 ' + i + ' 层', slots: Math.floor(((g && g.slotCount) || 10) / count) }); return arr;
    }
    return [{ name: (g && g.location) || (g && g.propertyName) || '车库', slots: (g && g.slotCount) || 10 }];
  }
  function getFloorsCount(g) { return getFloors(g).length; }
  function getTotalSlots(g) { var fa = getFloors(g); var t = 0; for (var i = 0; i < fa.length; i++) t += fa[i].slots; return t || (g && g.slotCount) || 10; }
  function getFloorsCountForType(type) {
    if (!type) return 1;
    for (var i = 0; i < PROPERTY_SLOTS.length; i++) {
      if (PROPERTY_SLOTS[i].type === type) {
        var f = PROPERTY_SLOTS[i].floors;
        if (Array.isArray(f)) return f.length;
        return (typeof f === 'number') ? f : 1;
      }
    }
    return 1;
  }

  function createElementFromHtml(html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    return div.firstChild;
  }

  function renderGarageDropdown() {
    var menu = document.getElementById('garage-dropdown-menu');
    if (!menu) return;
    var enabledGarages = garages.filter(function (g) { return g.enabled; });
    var html = '';
    enabledGarages.forEach(function (g) {
      var name = g.location || g.propertyName || '未命名';
      var count = g._count || 0;
      html += '<div class="garage-dropdown-item' + (g.id === currentGarageId ? ' active' : '') + '" data-id="' + g.id + '">' +
        Utils.escapeHtml(name) + '</div>';
    });
    if (enabledGarages.length === 0) {
      html += '<div class="garage-dropdown-item" style="opacity:0.5;">没有已启用的车库</div>';
    }
    menu.innerHTML = html;

    menu.querySelectorAll('.garage-dropdown-item[data-id]').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        menu.style.display = 'none';
        var gid = parseInt(this.getAttribute('data-id'));
        if (gid && gid !== currentGarageId) {
          currentGarageId = gid;
          showVehicleView();
        }
      });
    });
  }

  function renderGarageGrid() {
    var grid = document.getElementById('garage-grid');
    if (!grid) return;

    var g = garages.find(function (x) { return x.id === currentGarageId; });
    if (!g || !g.enabled) {
      grid.innerHTML = '<div class="garage-empty">请先启用此资产并选择位置</div>';
      return;
    }

    var floorData = getFloors(g);
    var totalSlots = getTotalSlots(g);

    GTA.db.garageVehicles.where({ garageId: currentGarageId }).toArray().then(function (records) {
      var slotMap = {};
      records.forEach(function (rec) { slotMap[rec.sortOrder || 0] = rec; });

      var html = '';
      var totalUsed = 0;
      var globalSlot = 0;

      for (var f = 0; f < floorData.length; f++) {
        var fName = floorData[f].name;
        var fSlots = floorData[f].slots;
        var floorUsed = 0;

        if (floorData.length > 1) {
          html += '<div class="floor-section-header" id="floor-' + (f + 1) + '">' +
            '<span class="floor-label">' + Utils.escapeHtml(fName) + ' (' + fSlots + '车位)</span>' +
            '<span class="floor-divider"></span></div>';
        }

        for (var i = 0; i < fSlots; i++, globalSlot++) {
          if (slotMap[globalSlot]) {
            floorUsed++;
            var rec = slotMap[globalSlot];
            var v = Catalog.getById(rec.vehicleId);
            if (v) {
              var thumb = v.thumbnail || (v.model_name ? 'https://cdn-gta-images.antwen.cn/images/' + v.model_name.toLowerCase() + '/main.jpg' : '');
              html += '<div class="garage-vehicle" data-vid="' + v.id + '" data-recid="' + rec.id + '" data-slot="' + globalSlot + '">' +
                (thumb ? '<img src="' + thumb + '" alt="' + Utils.escapeHtml(v.name) + '" loading="lazy" onerror="this.style.opacity=\'0.3\'">' : '<div style="display:flex;align-items:center;justify-content:center;height:100%;opacity:0.2;font-size:2rem;">🏎️</div>') +
                '<div class="vehicle-name">' + Utils.escapeHtml(v.name) + '</div>' +
                '<div class="vehicle-actions">' +
                  '<button class="vehicle-action-btn edit" title="自定义卡片" onclick="event.stopPropagation();GTA.Garage._editCard(' + rec.id + ')">✎</button>' +
                  '<button class="vehicle-action-btn remove" title="移出车位" onclick="event.stopPropagation();GTA.Garage._removeCard(' + rec.id + ')">✕</button>' +
                '</div>' +
              '</div>';
            } else {
              html += renderEmptySlot(globalSlot);
            }
          } else {
            html += renderEmptySlot(globalSlot);
          }
        }
        totalUsed += floorUsed;
      }

      grid.innerHTML = html;

      // Update count
      // count is shown in the nav name already

      // Click vehicle card → navigate to detail
      var vehicleCards = grid.querySelectorAll('.garage-vehicle');
      vehicleCards.forEach(function (card) {
        card.addEventListener('click', function (e) {
          // Don't navigate if clicking on action buttons
          if (e.target.closest('.vehicle-action-btn')) return;
          var vid = this.getAttribute('data-vid');
          if (vid) GTA.Router.navigate('vehicle/' + vid);
        });
      });

      // Setup drag and drop
      setupVehicleDragAndDrop();
    });
  }

  function renderEmptySlot(index) {
    return '<div class="garage-slot-empty" onclick="GTA.Garage._addToSlot(' + index + ')">' +
      '<span class="slot-number">' + (index + 1) + '</span>' +
      '<span class="slot-icon">+</span>' +
    '</div>';
  }

  // ==================== ADD VEHICLE TO SLOT ====================

  async function showAddVehicleToSlotModal(slotIndex) {
    await GTA.db.ready();
    var g = garages.find(function (x) { return x.id === currentGarageId; });
    if (!g) return;

    var owned = await GTA.db.ownedVehicles.toArray();
    var ownedIds = new Set(owned.map(function (r) { return r.vehicleId; }));
    var existing = await GTA.db.garageVehicles.where({ garageId: currentGarageId }).toArray();
    var allVehicles = Catalog.getAll();
    var available = allVehicles.filter(function (v) { return ownedIds.has(v.id); });

    if (available.length === 0) {
      GTA.Toast.info('没有已收藏的车辆，请先从百科添加');
      return;
    }

    var html = '<input type="text" class="form-input garage-add-search" placeholder="搜索车辆名称..." style="margin-bottom:var(--space-sm);">';
    html += '<div class="add-vehicle-list" id="add-vehicle-list" style="max-height:350px;overflow-y:auto;">';
    available.forEach(function (v) {
      html += '<div class="add-vehicle-item" data-vid="' + v.id + '" data-search-text="' + Utils.escapeHtml(v.name.toLowerCase()) + '">' +
        (Catalog.isDiscontinued(v.name) ? '<span class="badge badge-discontinued">绝版</span> ' : '') +
        Utils.escapeHtml(v.name) +
        ' <span style="color:var(--color-gold);font-size:11px;">' + Utils.formatCurrency(v.price_buy) + '</span>' +
      '</div>';
    });
    html += '</div>';

    GTA.Modal.show({
      title: '添加车辆到位置 ' + (slotIndex + 1) + ' — ' + Utils.escapeHtml(g.location || g.propertyName),
      body: html,
      showCancel: false,
      confirmText: '关闭',
      onShow: function () {
        var addedRecId = null;
        var searchInput = document.querySelector('.garage-add-search');
        var listContainer = document.getElementById('add-vehicle-list');
        var items = listContainer.querySelectorAll('.add-vehicle-item');

        // Search filter
        if (searchInput) {
          searchInput.addEventListener('input', function () {
            var q = this.value.toLowerCase().trim();
            items.forEach(function (item) {
              var text = item.getAttribute('data-search-text') || '';
              item.style.display = !q || text.indexOf(q) !== -1 ? '' : 'none';
            });
          });
          setTimeout(function () { searchInput.focus(); }, 100);
        }

        items.forEach(function (item) {
          item.onclick = async function () {
            if (this.classList.contains('added')) return;
            // Undo previous selection in this modal session
            document.querySelectorAll('.add-vehicle-item.added').forEach(function (el) {
              el.classList.remove('added');
              el.style.opacity = '';
              el.innerHTML = el.getAttribute('data-original-html') || el.innerHTML;
            });
            this.classList.add('added');
            this.setAttribute('data-original-html', this.innerHTML);
            var vid = this.getAttribute('data-vid');

            // Remove previous record at this slot (from DB, fresh query)
            var current = await GTA.db.garageVehicles.where({ garageId: currentGarageId }).toArray();
            var atSlot = current.find(function (r) { return (r.sortOrder || 0) === slotIndex; });
            if (atSlot) {
              await GTA.db.garageVehicles.delete(atSlot.id);
            }

            // Add new record
            var newId = await GTA.db.garageVehicles.add({
              garageId: currentGarageId,
              vehicleId: vid,
              sortOrder: slotIndex
            });
            this.style.opacity = '0.4';
            this.innerHTML += ' ✓';
            GTA.Toast.success('已添加到位置 ' + (slotIndex + 1));
            renderGarageGrid();
            GTA.EventBus.emit('garage:changed', { garageId: currentGarageId });
          };
        });
      }
    });
  }

  // ==================== EDIT VEHICLE CARD ====================

  function showEditVehicleCardModal(recordId) {
    GTA.db.garageVehicles.get(recordId).then(async function (rec) {
      if (!rec) { GTA.Toast.error('记录不存在'); return; }
      var vehicle = Catalog.getById(rec.vehicleId);
      var vehicleName = vehicle ? vehicle.name : '(未知车辆)';
      var vehicleId = rec.vehicleId;

      var albumPhotos = [];
      try { albumPhotos = await GTA.ImageStore.getPhotos(vehicleId); } catch (e) {}

      var albumHtml = '';
      if (albumPhotos.length > 0) {
        albumHtml = '<div class="form-group" style="margin-bottom:12px;">' +
          '<label class="form-label">📸 从相册选择</label>' +
          '<div class="album-photo-picker" id="album-photo-picker" style="display:flex;gap:6px;flex-wrap:wrap;max-height:120px;overflow-y:auto;">';
        albumPhotos.forEach(function (photo) {
          var url = GTA.ImageStore.getPhotoUrl(photo, true);
          if (url) {
            albumHtml += '<div class="album-thumb' + (rec.customImagePhotoId === photo.id ? ' selected' : '') + '" data-photo-id="' + photo.id + '" style="width:60px;height:45px;border-radius:4px;overflow:hidden;cursor:pointer;border:2px solid ' + (rec.customImagePhotoId === photo.id ? 'var(--color-gold)' : 'transparent') + ';flex-shrink:0;">' +
              '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;" alt="">' +
            '</div>';
          }
        });
        albumHtml += '</div></div>';
      }

      var selectedPhotoId = rec.customImagePhotoId || null;
      var selectedPhotoDataUrl = rec.customImage || '';

      var bodyHtml =
        '<p class="text-sm text-muted" style="margin-bottom:16px;">自定义「<strong>' + Utils.escapeHtml(vehicleName) + '</strong>」的卡片显示</p>' +
        albumHtml +
        '<div class="form-group" style="margin-bottom:12px;">' +
          '<label class="form-label">🖼️ ' + (albumPhotos.length > 0 ? '或上传新图片' : '上传自定义图片') + '</label>' +
          '<div style="display:flex;gap:8px;align-items:center;">' +
            '<input type="file" id="card-custom-image" accept="image/png,image/jpeg,image/webp" style="flex:1;font-size:12px;">' +
            (rec.customImage ? '<button class="btn btn-secondary btn-sm" id="btn-remove-custom-img" style="white-space:nowrap;">移除</button>' : '') +
          '</div>' +
          (rec.customImage ? '<div style="margin-top:8px;" id="card-img-preview"><img src="' + rec.customImage + '" style="width:120px;height:68px;object-fit:cover;border-radius:4px;border:1px solid var(--color-glass-border);"></div>' : '<div style="margin-top:8px;display:none;" id="card-img-preview"><img src="" style="width:120px;height:68px;object-fit:cover;border-radius:4px;border:1px solid var(--color-glass-border);"></div>') +
          '<p class="text-xs text-muted" style="margin-top:4px;">上传新图片会同时保存到车辆相册</p>' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:12px;">' +
          '<label class="form-label">左边框颜色</label>' +
          '<div style="display:flex;gap:8px;align-items:center;">' +
            '<input type="color" class="form-input" id="card-custom-color" value="' + (rec.customColor || '#d4a843') + '" style="width:48px;height:32px;padding:2px;">' +
            '<span class="text-xs text-muted">选择颜色或留默认金色</span>' +
          '</div>' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:12px;">' +
          '<label class="form-label">备注</label>' +
          '<textarea class="form-input" id="card-note" rows="2" placeholder="例如：满改、Benny\'s、F1胎..." maxlength="120" style="resize:vertical;">' + Utils.escapeHtml(rec.note || '') + '</textarea>' +
        '</div>';

      GTA.Modal.show({
        title: '自定义卡片',
        body: bodyHtml,
        confirmText: '保存',
        cancelText: '取消',
        onConfirm: async function () {
          var customColor = (document.getElementById('card-custom-color') || {}).value || '';
          var note = (document.getElementById('card-note') || {}).value || '';
          var imageFile = (document.getElementById('card-custom-image') || {}).files || [];
          var customImage = selectedPhotoDataUrl;

          try {
            if (imageFile.length > 0 && imageFile[0].size < 5 * 1024 * 1024) {
              customImage = await fileToDataUrl(imageFile[0]);
              try { await GTA.ImageStore.savePhoto(vehicleId, imageFile[0], false); } catch (e) {}
            }
            await GTA.db.garageVehicles.update(recordId, {
              customColor: customColor,
              note: note.trim(),
              customImage: customImage,
              customImagePhotoId: selectedPhotoId || 0
            });
            GTA.Toast.success('已保存');
            renderGarageGrid();
          } catch (e) {
            GTA.Toast.error('保存失败');
          }
        },
        onShow: function () {
          var picker = document.getElementById('album-photo-picker');
          if (picker) {
            picker.querySelectorAll('.album-thumb').forEach(function (thumb) {
              thumb.addEventListener('click', async function () {
                var photoId = parseInt(this.getAttribute('data-photo-id'));
                var photo = albumPhotos.find(function (p) { return p.id === photoId; });
                if (!photo) return;
                var blobUrl = GTA.ImageStore.getPhotoUrl(photo, false);
                if (blobUrl) {
                  selectedPhotoDataUrl = await blobToDataUrl(blobUrl);
                  selectedPhotoId = photoId;
                  var preview = document.querySelector('#card-img-preview img');
                  var previewDiv = document.getElementById('card-img-preview');
                  if (preview && previewDiv) {
                    preview.src = selectedPhotoDataUrl;
                    previewDiv.style.display = 'block';
                  }
                  picker.querySelectorAll('.album-thumb').forEach(function (t) { t.style.borderColor = 'transparent'; });
                  this.style.borderColor = 'var(--color-gold)';
                }
              });
            });
          }
          var removeBtn = document.getElementById('btn-remove-custom-img');
          if (removeBtn) {
            removeBtn.addEventListener('click', async function () {
              selectedPhotoDataUrl = '';
              selectedPhotoId = null;
              await GTA.db.garageVehicles.update(recordId, { customImage: '', customImagePhotoId: 0 });
              GTA.Toast.info('图片已移除');
              GTA.Modal.hide();
              renderGarageGrid();
            });
          }
        }
      });
    }).catch(function () {
      GTA.Toast.error('读取记录失败');
    });
  }

  function blobToDataUrl(blobUrl) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(blobUrl);
        var canvas = document.createElement('canvas');
        var maxW = 400;
        var scale = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { URL.revokeObjectURL(blobUrl); reject(new Error('blob convert failed')); };
      img.src = blobUrl;
    });
  }

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('文件读取失败')); };
      reader.readAsDataURL(file);
    });
  }

  // ==================== VEHICLE DRAG & DROP ====================

  function setupVehicleDragAndDrop() {
    var grid = document.getElementById('garage-grid');
    if (!grid) return;

    grid.addEventListener('dragstart', function (e) {
      var card = e.target.closest('.garage-vehicle');
      if (!card) return;
      dragState.type = 'vehicle';
      dragState.sourceGarageId = currentGarageId;
      dragState.vehicleId = card.getAttribute('data-vid');
      dragState.recordId = parseInt(card.getAttribute('data-recid'));
      e.dataTransfer.setData('text/plain', dragState.vehicleId);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });

    grid.addEventListener('dragend', function (e) {
      var card = e.target.closest('.garage-vehicle');
      if (card) card.classList.remove('dragging');
      document.querySelectorAll('.garage-drop-indicator').forEach(function (el) { el.remove(); });
      dragState.type = null;
      dragState.sourceGarageId = null;
    });

    grid.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      var afterEl = getDragAfterElement(grid, e.clientY);
      grid.querySelectorAll('.garage-drop-indicator').forEach(function (el) { el.remove(); });
      var indicator = document.createElement('div');
      indicator.className = 'garage-drop-indicator';
      if (afterEl) {
        grid.insertBefore(indicator, afterEl);
      } else {
        grid.appendChild(indicator);
      }
    });

    grid.addEventListener('drop', async function (e) {
      e.preventDefault();
      var vehicleId = e.dataTransfer.getData('text/plain');
      if (!vehicleId || dragState.type !== 'vehicle') return;

      var afterEl = getDragAfterElement(grid, e.clientY);
      var targetSlot = afterEl ? parseInt(afterEl.getAttribute('data-slot')) : null;
      var g = garages.find(function (x) { return x.id === currentGarageId; });
      var slotCount = g ? (g.slotCount || 10) : 10;

      if (targetSlot === null) targetSlot = slotCount - 1;

      try {
        var vehicles = await GTA.db.garageVehicles
          .where('garageId').equals(currentGarageId)
          .sortBy('sortOrder');

        var dragged = vehicles.find(function (v) { return v.vehicleId === vehicleId; });
        if (!dragged) return;

        var oldSlot = dragged.sortOrder || 0;
        var atTarget = vehicles.find(function (v) { return v.id !== dragged.id && (v.sortOrder || 0) === targetSlot; });

        if (atTarget) {
          await GTA.db.garageVehicles.update(dragged.id, { sortOrder: targetSlot });
          await GTA.db.garageVehicles.update(atTarget.id, { sortOrder: oldSlot });
        } else {
          await GTA.db.garageVehicles.update(dragged.id, { sortOrder: targetSlot });
        }

        renderGarageGrid();
        GTA.EventBus.emit('garage:changed', { garageId: currentGarageId });
      } catch (er) {
        console.error('[Garage] DnD error:', er);
      }
    });
  }

  function getDragAfterElement(container, y) {
    var elements = [].concat(
      Array.from(container.querySelectorAll('.garage-vehicle:not(.dragging)')),
      Array.from(container.querySelectorAll('.garage-slot-empty'))
    );
    return elements.reduce(function (closest, child) {
      var box = child.getBoundingClientRect();
      var offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      }
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // ==================== GLOBAL SEARCH ====================

  async function performGlobalSearch(term) {
    var q = term.toLowerCase();
    var results = { properties: [], vehicles: [] };

    // Search enabled properties by name and location
    garages.forEach(function (g) {
      if (!g.enabled) return;
      var nameMatch = (g.propertyName || '').toLowerCase().indexOf(q) !== -1;
      var locMatch = g.location && g.location.toLowerCase().indexOf(q) !== -1;
      if (nameMatch || locMatch) {
        results.properties.push({ id: g.id, name: g.propertyName, location: g.location, category: g.propertyCategory });
      }
    });

    // Search vehicles across all enabled properties
    try {
      var allRecords = await GTA.db.garageVehicles.toArray();
      var garageMap = {};
      garages.forEach(function (g) { garageMap[g.id] = g; });

      var seen = new Set();
      for (var i = 0; i < allRecords.length; i++) {
        var rec = allRecords[i];
        var gRec = garageMap[rec.garageId];
        if (!gRec || !gRec.enabled) continue;

        var vehicle = Catalog.getById(rec.vehicleId);
        if (!vehicle) continue;
        var matches = (vehicle.name || '').toLowerCase().indexOf(q) !== -1 ||
                       (vehicle.brand || '').toLowerCase().indexOf(q) !== -1;
        if (!matches) continue;
        var key = rec.vehicleId + '|' + rec.garageId;
        if (seen.has(key)) continue;
        seen.add(key);
        results.vehicles.push({
          recordId: rec.id,
          vehicleId: rec.vehicleId,
          vehicleName: vehicle.name,
          vehicleBrand: vehicle.brand,
          garageId: rec.garageId,
          garageName: gRec.location || gRec.propertyName || '(未命名)',
          slotIndex: rec.sortOrder || 0
        });
      }
    } catch (e) {
      console.error('[Garage] Search error:', e);
    }

    showSearchResults(results, q);
  }

  function showSearchResults(results, rawTerm) {
    var panel = document.getElementById('search-results-panel');
    if (!panel) return;

    var total = results.properties.length + results.vehicles.length;
    var maxShow = 15;

    if (total === 0) {
      panel.innerHTML = '<div class="search-result-empty">未找到匹配 "<strong>' + Utils.escapeHtml(rawTerm) + '</strong>" 的结果</div>';
      panel.style.display = 'block';
      return;
    }

    var html = '';

    if (results.properties.length > 0) {
      html += '<div class="search-result-group">资产</div>';
      var showProps = results.properties.slice(0, maxShow);
      showProps.forEach(function (p) {
        html += '<div class="search-result-item search-result-property" data-gid="' + p.id + '">' +
          '<span class="search-result-icon">📁</span>' +
          '<span class="search-result-name">' + Utils.escapeHtml(p.location || p.name) + '</span>' +
        '</div>';
      });
    }

    if (results.vehicles.length > 0) {
      html += '<div class="search-result-group">载具</div>';
      var remaining = maxShow - Math.min(results.properties.length, maxShow);
      if (remaining <= 0 && results.vehicles.length > 0) {
        html += '<div class="search-result-more">还有 ' + results.vehicles.length + ' 个匹配...</div>';
      } else {
        var showVehicles = results.vehicles.slice(0, Math.max(remaining, 3));
        showVehicles.forEach(function (v) {
          html += '<div class="search-result-item search-result-vehicle" data-gid="' + v.garageId + '" data-vid="' + v.vehicleId + '">' +
            '<span class="search-result-icon">🚗</span>' +
            '<span class="search-result-name">' + Utils.escapeHtml(v.vehicleName) + '</span>' +
            '<span class="search-result-sub"> 在「' + Utils.escapeHtml(v.garageName) + '」位置 ' + (v.slotIndex + 1) + '</span>' +
          '</div>';
        });
        if (results.vehicles.length > showVehicles.length) {
          html += '<div class="search-result-more">还有 ' + (results.vehicles.length - showVehicles.length) + ' 个匹配...</div>';
        }
      }
    }

    panel.innerHTML = html;
    panel.style.display = 'block';

    panel.querySelectorAll('.search-result-property').forEach(function (el) {
      el.addEventListener('click', function () {
        var gid = parseInt(this.getAttribute('data-gid'));
        hideSearchResults();
        document.getElementById('garage-search-input').value = '';
        currentGarageId = gid;
        var g = garages.find(function (x) { return x.id === gid; });
        if (g && g.enabled) {
          showVehicleView();
        } else {
          showManageView();
          showPropertyConfig(g);
        }
      });
    });

    panel.querySelectorAll('.search-result-vehicle').forEach(function (el) {
      el.addEventListener('click', function () {
        var gid = parseInt(this.getAttribute('data-gid'));
        var vid = this.getAttribute('data-vid');
        highlightVehicleId = vid;
        hideSearchResults();
        document.getElementById('garage-search-input').value = '';
        currentGarageId = gid;
        var g = garages.find(function (x) { return x.id === gid; });
        if (g && g.enabled) {
          showVehicleView();
        }
      });
    });
  }

  function hideSearchResults() {
    var panel = document.getElementById('search-results-panel');
    if (panel) panel.style.display = 'none';
  }

  // ==================== EVENT BINDING ====================

  function bindEvents() {
    // Manage button
    var manageBtn = document.getElementById('btn-manage-garages');
    if (manageBtn) {
      manageBtn.onclick = function () { showManageView(); };
    }

    // Back to vehicle view
    var backBtn = document.getElementById('btn-back-to-garages');
    if (backBtn) {
      backBtn.onclick = function () { showVehicleView(); };
    }

    // Prev/Next
    var prevBtn = document.getElementById('btn-prev-garage');
    var nextBtn = document.getElementById('btn-next-garage');
    if (prevBtn) prevBtn.onclick = function () { navigateGarage(-1); };
    if (nextBtn) nextBtn.onclick = function () { navigateGarage(1); };

    // Dropdown toggle
    var dropdownMenu = document.getElementById('garage-dropdown-menu');
    var dropdownBtn = document.getElementById('btn-garage-dropdown');
    if (dropdownBtn && dropdownMenu) {
      dropdownBtn.onclick = function (e) {
        e.stopPropagation();
        var open = dropdownMenu.style.display === 'block';
        dropdownMenu.style.display = open ? 'none' : 'block';
        if (!open) renderGarageDropdown();
      };
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
      if (e.target.closest('#btn-garage-dropdown') || e.target.closest('#garage-dropdown-menu')) return;
      if (dropdownMenu) dropdownMenu.style.display = 'none';
    });

    // Global search
    var searchInput = document.getElementById('garage-search-input');
    if (searchInput) {
      // Remove old listeners by cloning (safe since we rebind in init)
      var newInput = searchInput.cloneNode(true);
      searchInput.parentNode.replaceChild(newInput, searchInput);
      searchInput = newInput;

      var debouncedSearch = Utils.debounce(function () {
        var term = searchInput.value.trim();
        if (term) { performGlobalSearch(term); } else { hideSearchResults(); }
      }, 200);
      searchInput.addEventListener('input', debouncedSearch);
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { this.value = ''; hideSearchResults(); }
      });
    }

    // Click outside search
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#garage-global-search')) hideSearchResults();
    });
  }

  // ==================== EVENT BUS ====================

  GTA.EventBus.on('garage:changed', function () {
    loadGarages().then(function () {
      if (isManageView) {
        renderPropertyCards();
      } else {
        showVehicleView();
      }
    });
  });

  // ==================== RETURN PUBLIC API ====================

  return {
    init: init,
    destroy: destroy,
    _showVehicleView: showVehicleView,
    _showManageView: showManageView,
    _editCard: showEditVehicleCardModal,
    _removeCard: async function (recid) {
      await GTA.db.garageVehicles.delete(recid);
      GTA.Toast.success('已移出车位');
      renderGarageGrid();
      GTA.EventBus.emit('garage:changed', { garageId: currentGarageId });
    },
    _addToSlot: showAddVehicleToSlotModal
  };
})();
