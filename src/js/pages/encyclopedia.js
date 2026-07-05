/* ===== Encyclopedia Page ===== */
window.GTA = window.GTA || {};

GTA.Encyclopedia = (function () {
  var Utils = GTA.Utils;
  var Catalog = GTA.VehicleCatalog;
  var ownedSet = new Set();
  var currentBrand = '';
  var currentType = '';

  // Type → icon mapping
  var TYPE_ICONS = {
    '超级跑车': 'super.png',
    '跑车': 'sports.png',
    '经典跑车': 'sports-classic.png',
    '肌肉车': 'muscle.png',
    '轿跑车': 'coupes.png',
    '轿车': 'sedans.png',
    'SUV': 'suvs.png',
    '越野车': 'off-road.png',
    '摩托车': 'motorcycles.png',
    '自行车': 'cycles.png',
    '小型汽车': 'compacts.png',
    '厢型车': 'vans.png',
    '商用车': 'commercial.png',
    '工业用车': 'industrial.png',
    '公共事业用车': 'utility.png',
    '军用车': 'military.png',
    '服务用车': 'service.png',
    '特种车': 'emergency.png',
    '直升机': 'helicopters.png',
    '飞机': 'planes.png',
    '船': 'boats.png',
    '开轮式': 'open-wheel.png'
  };

  // Brand name → icon filename mapping
  var BRAND_ICONS = {
    '佩嘉西': '佩嘉西.png',
    '傲弗拉': '傲弗拉.png',
    '特卢菲': '特卢菲.png',
    '古罗帝': '古罗帝.png',
    '普林西比': '普林西比.png',
    '奥北': '奥北.png',
    '贝飞特': '贝飞特.png',
    '贝飞特2': '贝飞特2.png',
    '绝品': '绝品.png',
    '绝品2': '绝品2.png',
    '爱尼仕': '爱尼仕.png',
    '爱尼仕2': '爱尼仕2.png',
    '浪子': '浪子.png',
    '旋风': '旋风.png',
    '旋风2': '旋风2.png',
    '绝致': '绝致.png',
    '皇霸天': '皇霸天.png',
    '冒险家': '冒险家.png',
    '冒险家2': '冒险家2.png',
    '麦霸子': '麦霸子.png',
    '丁卡': '丁卡.svg',
    '卡林': '卡林.png',
    '卡林2': '卡林2.png',
    '威皮': '威皮.png',
    '威皮2': '威皮2.png',
    '威尼': '威尼.png',
    '威尼2': '威尼2.png',
    '威霸': '威霸.png',
    '威霸2': '威霸2.png',
    '卡尼斯': '卡尼斯.png',
    '卡尼斯2': '卡尼斯2.png',
    '欧斯洛': '欧斯洛.png',
    '欧斯洛2': '欧斯洛2.png',
    '菲斯特': '菲斯特.png',
    '菲斯特2': '菲斯特2.png',
    '亚班尼': '亚班尼.png',
    '亚班尼2': '亚班尼2.png',
    '福狮': '福狮.png',
    '福狮2': '福狮2.png',
    '雪佛': '雪佛.png',
    '赛柯尼': '赛柯尼.png',
    '赛柯尼2': '赛柯尼2.png',
    '兰帕达缇': '兰帕达缇.png',
    '兰帕达缇2': '兰帕达缇2.png',
    '非凡': '非凡.png',
    '非凡2': '非凡2.png',
    '培罗': '培罗.png',
    '埃努斯': '埃努斯.png',
    '诗津': '诗津.png',
    '诗津2': '诗津2.png',
    '敦追里': '敦追里.png',
    '敦追里2': '敦追里2.png',
    '麦克斯韦': '麦克斯韦.png',
    '麦克斯韦2': '麦克斯韦2.png',
    '毕福': '毕福.png',
    '毕福2': '毕福2.png',
    '长崎': '长崎.svg',
    '西部-C': '西部-C.png',
    '西部-M': '西部-M.png',
    'LCC': 'LCC.png',
    'MTL': 'MTL.png',
    'MTL2': 'MTL2.png',
    '乔氏': '乔氏.png',
    '包洛坎': '包洛坎.png',
    '巨象': '巨象.png',
    '卢恩': '卢恩.png',
    '史丹利': '史丹利.png',
    '埃伯哈德': '埃伯哈德.png',
    '水上枭雄': '水上枭雄.png',
    '海怪（厂商）': '海怪（厂商）.png',
    '烈火马': '烈火马.png',
    '白金汉': '白金汉.png',
    '白金汉2': '白金汉2.png',
    '维沙': '维沙.png',
    '苔原': '苔原.png',
    '苔原2': '苔原2.png',
    '赛乐斯特': '赛乐斯特.png',
    '赛乐斯特2': '赛乐斯特2.png',
    '佩诺': '佩诺.png',
    '佩诺2': '佩诺2.png',
    '小羊杰克': '小羊杰克.png',
    '卡拉斯科': '卡拉斯科.svg',
    '卡拉斯科2': '卡拉斯科2.png',
    'PEDCycles': 'PEDCycles.png',
    '3': '3.png'
  };

  var currentOwned = '';

  function init() {
    GTA.log('[Encyclopedia] Init');
    GTA.FilterBar.init(onFilterChange);
    buildBrandSidebar();
    buildTypeSidebar();
    bindOwnedChips();
    GTA.VehicleCard.loadStreetCarModels().then(function () {
      loadOwnedSet().then(function () {
        renderCards();
      });
    });
  }

  function bindOwnedChips() {
    var container = document.getElementById('filter-owned-chips');
    if (!container) return;
    container.querySelectorAll('.filter-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        container.querySelectorAll('.filter-chip').forEach(function (c) { c.classList.remove('active'); });
        this.classList.add('active');
        currentOwned = this.getAttribute('data-owned');
        renderCards();
      });
    });
  }

  function destroy() {}

  function buildBrandSidebar() {
    var sidebar = document.getElementById('brand-sidebar');
    if (!sidebar) return;

    var brands = Catalog.getBrands();
    var html = '<div class="brand-item active" data-brand=""><span class="brand-label">全部</span></div>';

    brands.forEach(function (brand) {
      var icon = BRAND_ICONS[brand];
      if (!icon) {
        // No icon — use text label
        html += '<div class="brand-item" data-brand="' + Utils.escapeHtml(brand) + '"><span class="brand-label">' + Utils.escapeHtml(brand) + '</span></div>';
        return;
      }

      var baseName = icon.replace(/\.(png|svg)$/, '');
      var ext = icon.match(/\.(png|svg)$/)[1];
      var secondExt = ext; // same extension for second image

      // Check if a second variant exists (e.g., 卡林.png + 卡林2.png)
      var nameWithoutExt = brand;
      var secondIcon = BRAND_ICONS[brand + '2'];

      var brandName = Utils.escapeHtml(brand);
      if (secondIcon) {
        var secondBase = brand + '2';
        html += '<div class="brand-item" data-brand="' + brandName + '" title="' + brandName + '">' +
          '<img src="/assets/brand-icons/' + baseName + '.' + ext + '" alt="' + brandName + '" loading="lazy" onerror="this.style.display=\'none\'">' +
          '<img src="/assets/brand-icons/' + secondBase + '.' + ext + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
          '<span class="brand-name">' + brandName + '</span>' +
        '</div>';
      } else {
        html += '<div class="brand-item" data-brand="' + brandName + '" title="' + brandName + '">' +
          '<img src="/assets/brand-icons/' + baseName + '.' + ext + '" alt="' + brandName + '" loading="lazy" onerror="this.style.display=\'none\'">' +
          '<span class="brand-name">' + brandName + '</span>' +
        '</div>';
      }
    });

    sidebar.innerHTML = html;

    // Bind click events
    sidebar.querySelectorAll('.brand-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var brand = this.getAttribute('data-brand');
        currentBrand = brand;
        sidebar.querySelectorAll('.brand-item').forEach(function (el) { el.classList.remove('active'); });
        this.classList.add('active');
        // Sync with filter dropdown
        var brandSelect = document.getElementById('filter-brand');
        if (brandSelect) brandSelect.value = brand;
        renderCards();
      });
    });
  }

  async function loadOwnedSet() {
    try {
      await GTA.db.ready();
      var owned = await GTA.db.ownedVehicles.toArray();
      ownedSet.clear();
      owned.forEach(function (r) {
        if (Catalog.getById(r.vehicleId)) ownedSet.add(r.vehicleId);
      });
    } catch (e) {
      console.error('[Encyclopedia] Error loading owned:', e);
    }
  }

  function buildTypeSidebar() {
    var sidebar = document.getElementById('type-sidebar');
    if (!sidebar) return;

    var types = Catalog.getTypes();
    var html = '<div class="type-item active" data-type=""><span class="type-label">全部</span></div>';

    types.forEach(function (type) {
      var icon = TYPE_ICONS[type];
      var typeName = Utils.escapeHtml(type);
      if (icon) {
        html += '<div class="type-item" data-type="' + typeName + '" title="' + typeName + '">' +
          '<img src="/assets/type-icons/' + icon + '" alt="' + typeName + '" loading="lazy">' +
          '<span class="type-name">' + typeName + '</span>' +
        '</div>';
      } else {
        html += '<div class="type-item" data-type="' + typeName + '"><span class="type-label">' + typeName + '</span></div>';
      }
    });

    sidebar.innerHTML = html;

    sidebar.querySelectorAll('.type-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var type = this.getAttribute('data-type');
        currentType = type;
        sidebar.querySelectorAll('.type-item').forEach(function (el) { el.classList.remove('active'); });
        this.classList.add('active');
        var typeSelect = document.getElementById('filter-type');
        if (typeSelect) typeSelect.value = type;
        renderCards();
      });
    });
  }

  function onFilterChange(filters) {
    renderCards(filters);
  }

  async function renderCards(filters) {
    await loadOwnedSet();

    var vehicles = Catalog.getAll();
    if (!filters) filters = GTA.FilterBar.getFilters();

    if (currentBrand) {
      vehicles = vehicles.filter(function (v) { return v.brand === currentBrand; });
    }
    if (currentType) {
      vehicles = vehicles.filter(function (v) { return v.type === currentType; });
    }
    if (filters.search) {
      var q = filters.search.toLowerCase();
      vehicles = vehicles.filter(function (v) {
        return (v.name || '').toLowerCase().indexOf(q) !== -1 ||
               (v.brand || '').toLowerCase().indexOf(q) !== -1;
      });
    }
    if (currentOwned === 'yes') {
      vehicles = vehicles.filter(function (v) { return ownedSet.has(v.id); });
    } else if (currentOwned === 'no') {
      vehicles = vehicles.filter(function (v) { return !ownedSet.has(v.id); });
    } else if (currentOwned === 'discontinued') {
      vehicles = vehicles.filter(function (v) { return Catalog.isDiscontinued(v.name); });
    }

    var countEl = document.getElementById('results-count');
    if (countEl) {
      countEl.textContent = '显示 ' + vehicles.length + ' / ' + Catalog.getCount() + ' 辆';
    }

    var grid = document.getElementById('vehicle-grid');
    if (!grid) return;

    if (vehicles.length === 0) {
      grid.innerHTML = '<div class="no-results">没有找到匹配的载具</div>';
      return;
    }

    grid.innerHTML = '';
    vehicles.forEach(function (vehicle) {
      var isOwned = ownedSet.has(vehicle.id);
      var card = GTA.VehicleCard.render(vehicle, isOwned);
      grid.appendChild(card);
    });
  }

  GTA.EventBus.on('vehicle:added', function () { renderCards(); });
  GTA.EventBus.on('vehicle:removed', function () { renderCards(); });
  GTA.EventBus.on('catalog:loaded', function () {
    GTA.FilterBar.refresh();
    buildBrandSidebar();
    buildTypeSidebar();
    renderCards();
  });
  GTA.EventBus.on('catalog:discontinued', function () { renderCards(); });

  return { init: init, destroy: destroy };
})();
