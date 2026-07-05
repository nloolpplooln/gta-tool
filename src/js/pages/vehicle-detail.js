/* ===== Vehicle Detail Page ===== */
window.GTA = window.GTA || {};

GTA.VehicleDetail = (function () {
  var Utils = GTA.Utils;
  var Catalog = GTA.VehicleCatalog;
  var currentVehicleId = null;
  var currentVehicle = null;
  var blacklistData = null;
  var partsRestrictData = null;
  var streetCarColorsData = null;

  async function loadDataFiles() {
    try {
      var resp = await fetch('../../vehicle-blacklist.json');
      blacklistData = await resp.json();
    } catch (e) { blacklistData = { blacklist_models: [] }; }
    try {
      var resp = await fetch('../../vehicle-parts-restrictions.json');
      partsRestrictData = await resp.json();
    } catch (e) { partsRestrictData = {}; }
    try {
      var resp = await fetch('../../street-car-colors.json');
      streetCarColorsData = await resp.json();
    } catch (e) { streetCarColorsData = []; }
  }

  // Safe render wrapper — catches errors in optional render blocks
  function safeRender(fn, label) {
    try { return fn(); }
    catch (e) { console.error('[Detail] ' + label + ':', e); return ''; }
  }

  function init(params) {
    var vehicleId = params.id;
    if (!vehicleId) {
      GTA.Router.navigate('encyclopedia');
      return;
    }

    currentVehicleId = vehicleId;
    currentVehicle = Catalog.getById(vehicleId);

    if (!currentVehicle) {
      GTA.Toast.error('未找到该载具');
      GTA.Router.navigate('encyclopedia');
      return;
    }

    render();
    updateOwnershipButton();
    GTA.VehicleCard.loadStreetCarModels().then(function () {
      updateStreetCarBadge();
    });
    loadDataFiles().then(function () {
      renderExtraSections();
    });
  }

  function destroy() {
    currentVehicleId = null;
    currentVehicle = null;
  }

  async function render() {
    var container = document.getElementById('vehicle-detail-content');
    if (!container || !currentVehicle) return;

    var v = currentVehicle;

    container.innerHTML =
      // ── Hero Image (50vh) ──
      '<div class="detail-hero-image" style="position:relative;">' +
        '<div class="hero-img-placeholder">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15l-5-5L5 21"/></svg>' +
        '</div>' +
        (v.thumbnail ? '<img src="' + v.thumbnail + '" alt="" id="vehicle-image-preview" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity 220ms;z-index:2;" onerror="this.style.display=\'none\'" onload="this.style.opacity=\'1\'">' : (v.model_name ? '<img src="https://cdn-gta-images.antwen.cn/images/' + v.model_name.toLowerCase() + '/main.jpg" alt="" id="vehicle-image-preview" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity 220ms;z-index:2;" onerror="this.style.display=\'none\'" onload="this.style.opacity=\'1\'">' : '')) +
      '</div>' +

      // ── Hero Info Bar ──
      '<div class="detail-hero-info">' +
        '<div class="detail-hero-info-left">' +
          '<h1 class="detail-title">' + Utils.escapeHtml(v.name) +
            (Catalog.isDiscontinued(v.name) ? ' <span class="badge badge-discontinued">绝版</span>' : '') +
          '</h1>' +
          '<div class="detail-meta-bar">' +
            '<span class="detail-meta-item">' + Utils.escapeHtml(v.brand) + '</span>' +
            '<span class="detail-meta-divider"></span>' +
            '<span class="detail-meta-item">' + Utils.escapeHtml(v.type) + '</span>' +
            (v.seats ? '<span class="detail-meta-divider"></span><span class="detail-meta-item">' + v.seats + ' 座</span>' : '') +
            (v.dlc ? '<span class="detail-meta-divider"></span><span class="detail-meta-item">' + v.dlc + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="detail-hero-info-right">' +
          '<span class="detail-hero-price">' + Utils.formatCurrency(v.price_buy) + '</span>' +
          '<div class="detail-hero-specs">' +
            (v.performance ? '<div class="detail-hero-spec"><span class="detail-hero-spec-value">' + (v.performance.speed || '-') + '</span><span class="detail-hero-spec-label">速度</span></div>' : '') +
            (v.specs && v.specs.top_speed ? '<div class="detail-hero-spec"><span class="detail-hero-spec-value">' + v.specs.top_speed + '</span><span class="detail-hero-spec-label">极速</span></div>' : '') +
            '<div class="detail-hero-spec" id="hero-collection-status"><span class="detail-hero-spec-value">-</span><span class="detail-hero-spec-label">收藏</span></div>' +
          '</div>' +
          '<div class="ownership-toggle" id="ownership-toggle"></div>' +
        '</div>' +
      '</div>' +

      // ── Content Below Fold ──
      '<div class="detail-content-below">' +
        // Left column
        '<div>' +
          // Performance bars
          '<div class="performance-section">' +
            '<h3>性能数据</h3>' +
            renderPerformanceBars(v.performance) +
          '</div>' +

          // Specs table
          (v.specs ? renderSpecsTable(v.specs) : '') +

          // Release info
          (v.release ? renderReleaseInfo(v.release) : '') +

          // Upgrades
          (v.upgrades && v.upgrades.length > 0 ? renderUpgrades(v.upgrades) : '') +

          // Imani Tech
          (v.imani_tech && v.imani_tech.length > 0 ? renderImaniTech(v.imani_tech) : '') +
        '</div>' +

        // Right column
        '<div>' +
          // Game description
          (v.description ?
            '<div class="performance-section">' +
              '<h3>游戏描述</h3>' +
              '<blockquote style="margin:0;padding:var(--space-sm) var(--space-md);border-left:3px solid var(--color-gold);background:rgba(255,255,255,0.02);font-size:var(--font-size-sm);line-height:1.7;color:var(--color-text-secondary);">' +
                '<p style="margin:0;">"' + Utils.escapeHtml(v.description) + '"</p>' +
                (v.shop_source ? '<cite style="display:block;margin-top:var(--space-xs);font-style:normal;color:var(--color-gold);">' + Utils.escapeHtml(v.shop_source) + '</cite>' : '') +
              '</blockquote>' +
            '</div>' : '') +

          // Tags
          safeRender(() => renderTagsBlock(v), 'tags') +

          // Based on (real car)
          safeRender(() => renderBasedOnBlock(v), 'basedOn') +

          // Armor
          safeRender(() => renderArmorBlock(v), 'armor') +

          // Garage info
          '<div class="detail-garage-info" id="detail-garage-info"></div>' +
        '</div>' +

        // Full-width: Modifications
        safeRender(() => renderModificationsBlock(v), 'mods') +
        safeRender(() => renderLiveriesBlock(v), 'liveries') +
        safeRender(() => renderScreenshotsBlock(v), 'screenshots') +

        // Quick links — full width
        '<div class="detail-quick-links">' +
          '<button class="btn btn-secondary" id="btn-go-album">车辆相册</button>' +
          '<button class="btn btn-secondary" id="btn-go-mods">改装记录</button>' +
          '<button class="btn btn-secondary" id="btn-go-add-garage">加入车库</button>' +
          '<button class="btn compare-add-btn" id="btn-compare"' + (GTA.CompareList && GTA.CompareList.get().indexOf(currentVehicleId) !== -1 ? ' disabled style="opacity:0.5" title="已加入对比"' : '') + '>对比</button>' +
        '</div>' +
      '</div>';

    // Bind buttons
    document.getElementById('btn-go-album').addEventListener('click', function () {
      GTA.Router.navigate('album/' + currentVehicleId);
    });
    document.getElementById('btn-go-mods').addEventListener('click', function () {
      GTA.Router.navigate('mods/' + currentVehicleId);
    });
    document.getElementById('btn-go-add-garage').addEventListener('click', function () {
      addToGarage();
    });
    var compareBtn = document.getElementById('btn-compare');
    if (compareBtn) {
      compareBtn.addEventListener('click', function () {
        if (GTA.CompareList && GTA.CompareList.add(currentVehicleId)) {
          GTA.Toast.success('已加入对比 (' + GTA.CompareList.get().length + '/' + GTA.CompareList.max + ')');
          compareBtn.disabled = true;
          compareBtn.style.opacity = '0.5';
          compareBtn.title = '已加入对比';
        } else {
          GTA.Toast.warning('对比列表已满或已存在');
        }
      });
    }

    updateOwnershipButton();
    renderGarageInfo();

    // Fetch Xiaoheihe rich data
    fetchXiaoheiheData();
  }

  function renderSpecsTable(specs) {
    var html = '<div class="performance-section" style="margin-top:var(--space-lg);">';
    html += '<h3>详细规格</h3>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-sm) var(--space-xl);">';

    var labels = { gears: '档位', weight: '重量(kg)', layout: '布置', drive: '驱动', top_speed: '极速' };
    Object.keys(labels).forEach(function (k) {
      if (specs[k] !== undefined) {
        html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--color-sidebar-border);">' +
          '<span style="color:var(--color-text-muted);font-size:var(--font-size-sm)">' + labels[k] + '</span>' +
          '<span style="color:var(--color-text-primary);font-size:var(--font-size-sm);font-weight:var(--font-weight-medium)">' + specs[k] + '</span>' +
        '</div>';
      }
    });
    html += '</div></div>';
    return html;
  }

  function renderReleaseInfo(release) {
    var html = '<div class="performance-section" style="margin-top:var(--space-lg);">';
    html += '<h3>推出信息</h3>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-sm) var(--space-xl);">';

    if (release.version) {
      html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--color-sidebar-border);">' +
        '<span style="color:var(--color-text-muted);font-size:var(--font-size-sm)">版本</span>' +
        '<span style="color:var(--color-text-primary);font-size:var(--font-size-sm);font-weight:var(--font-weight-medium)">' + release.version + '</span></div>';
    }
    if (release.date) {
      html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--color-sidebar-border);">' +
        '<span style="color:var(--color-text-muted);font-size:var(--font-size-sm)">推出时间</span>' +
        '<span style="color:var(--color-text-primary);font-size:var(--font-size-sm);font-weight:var(--font-weight-medium)">' + release.date + '</span></div>';
    }
    html += '</div></div>';
    return html;
  }

  function renderUpgrades(upgrades) {
    var html = '<div class="performance-section" style="margin-top:var(--space-lg);">';
    html += '<h3>支持升级</h3>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:var(--space-xs);">';
    upgrades.forEach(function (u) {
      html += '<span class="badge" style="background:rgba(46,204,113,0.15);color:var(--color-success);border-color:rgba(46,204,113,0.3);">' + u + '</span>';
    });
    html += '</div></div>';
    return html;
  }

  function renderImaniTech(imani) {
    var html = '<div class="performance-section" style="margin-top:var(--space-lg);">';
    html += '<h3 style="color:var(--color-gold);">伊玛尼改装项</h3>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:var(--space-xs);">';
    imani.forEach(function (t) {
      html += '<span class="badge badge-legendary">' + t + '</span>';
    });
    html += '</div></div>';
    return html;
  }

  // ── Tag translation map ──
  var TAG_LABELS = {
    weaponized: '武装', armored: '装甲', weapons: '武器',
    bullet_resistant_front: '前防弹', bullet_resistant_rear: '后防弹', bullet_resistant_side: '侧防弹',
    homing_missiles: '追踪导弹', bombs: '炸弹', proximity_mines: '感应地雷', water_cannon: '水炮',
    countermeasures: '反制措施', missile_protection: '导弹锁定干扰',
    stealth: '隐形', submersible: '潜水', fly: '飞行', vtol: '垂直起降',
    jump: '跳跃', rocket_boost: '火箭助推', kers: '动能回收',
    autopilot: '自动驾驶', floating: '水面漂浮', amphibious: '两栖',
    towing: '拖车钩', tow_hook: '拖车钩',
    tuners: '改装车', jdm: 'JDM', electric: '电动', hybrid: '混合动力',
    hydraulics: '液压悬挂', custom: '可自定义', stock_car: '原厂车',
    liveries: '有涂装', trade_price: '批发价', special: '特殊载具',
    rc: '遥控', no_passive: '禁用被动', uncontrollable: '不可控',
    arena_war: '竞技场', gang: '帮派', variants: '多版本',
    hard_top_convertible: '硬顶敞篷', soft_top_convertible: '软顶敞篷',
    topless: '敞篷', snow: '雪地', hover: '悬浮', jet: '喷气',
    parachute: '降落伞', rappelling: '绳索下降',
    annual_event: '年度活动', mystery_prize: '神秘奖品', gives_rewards: '奖励载具',
    passengers_side: '副驾驶', stand_on_top: '可站立车顶',
    workshop: '工坊改装', icon_unique: '独特图标'
  };

  function renderArmorBlock(v) {
    if (!v.armor && !v.explosion_resistance && !v.missile_protection) return '';
    var html = '<div class="performance-section" style="margin-top:var(--space-lg);">';
    html += '<h3>防护信息</h3>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:var(--space-sm);align-items:center;">';

    if (v.armor) {
      html += '<span class="badge" style="background:rgba(231,76,60,0.15);color:#e74c3c;border-color:rgba(231,76,60,0.3);">' + Utils.escapeHtml(v.armor.name || '装甲') + '</span>';
    }
    if (v.missile_protection) {
      html += '<span class="badge" style="background:rgba(46,204,113,0.15);color:var(--color-success);border-color:rgba(46,204,113,0.3);">导弹锁定干扰</span>';
    }

    html += '</div>';

    // Explosion resistance bars
    if (v.explosion_resistance) {
      var er = v.explosion_resistance;
      var erKeys = ['er1', 'er2', 'er3', 'er4', 'er5'];
      var hasER = erKeys.some(function (k) { return er[k] !== null && er[k] !== undefined; });
      if (hasER) {
        html += '<div style="margin-top:var(--space-sm);font-size:var(--font-size-xs);color:var(--color-text-muted);">爆炸抗性（承受次数）</div>';
        html += '<div style="display:flex;gap:var(--space-xs);margin-top:4px;">';
        var erWeapons = [
          { key: 'er1', label: '追踪导弹', sub: '毒刺/暴君/飞机' },
          { key: 'er2', label: 'RPG/手雷', sub: '黏弹/MOC炮' },
          { key: 'er3', label: '爆炸弹', sub: 'MK2重型狙击枪' },
          { key: 'er4', label: '坦克炮', sub: '犀牛/APC' },
          { key: 'er5', label: '防空高射炮', sub: '防空拖车20mm' }
        ];
        for (var ei = 0; ei < erWeapons.length; ei++) {
          var ew = erWeapons[ei];
          var val = er[ew.key];
          var num = parseInt(val) || 0;
          var maxVal = 12; // for bar scaling (most vehicles < 12)
          var pct = num > 0 ? Math.min(100, Math.max(3, (num / maxVal) * 100)) : 0;
          var color = num >= 8 ? 'var(--color-success)' : num >= 4 ? '#f39c12' : num >= 2 ? '#e67e22' : '#e74c3c';
          html += '<div style="flex:1;text-align:center;">' +
            '<div style="font-size:10px;color:var(--color-text-muted);margin-bottom:1px;" title="' + ew.label + '">' + ew.label + '</div>' +
            '<div style="font-size:9px;color:var(--color-text-muted);margin-bottom:3px;opacity:0.6;line-height:1.1;" title="' + ew.sub + '">' + ew.sub + '</div>' +
            '<div style="background:var(--color-bg-tertiary);border-radius:3px;height:6px;overflow:hidden;">' +
              '<div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:3px;"></div>' +
            '</div>' +
            '<div style="font-size:11px;font-weight:var(--font-weight-bold);color:' + (num >= 4 ? 'var(--color-success)' : num >= 2 ? '#f39c12' : '#e74c3c') + ';margin-top:2px;">' + (num > 0 ? num + '发' : '-') + '</div>' +
          '</div>';
        }
        html += '</div>';
      }
    }

    html += '</div>';
    return html;
  }

  function renderBasedOnBlock(v) {
    if (!v.based_on) return '';
    var html = '<div class="performance-section" style="margin-top:var(--space-lg);">';
    html += '<h3>真实车型</h3>';
    html += '<p style="color:var(--color-text-secondary);font-size:var(--font-size-sm);margin:0;">' + Utils.escapeHtml(v.based_on) + '</p>';
    if (v.based_on_sc && v.based_on_sc !== v.based_on) {
      html += '<p style="color:var(--color-text-muted);font-size:var(--font-size-xs);margin:4px 0 0;">' + Utils.escapeHtml(v.based_on_sc) + '</p>';
    }
    html += '</div>';
    return html;
  }

  function renderTagsBlock(v) {
    if (!v.tags || Object.keys(v.tags).length === 0) return '';
    var activeTags = Object.keys(v.tags).filter(function (k) { return v.tags[k]; });
    if (activeTags.length === 0) return '';

    // Filter out generic/uninteresting tags
    var skipTags = { id: true, created_at: true, updated_at: true, model_name: true, vehicle_id: true };
    var displayTags = activeTags.filter(function (t) { return !skipTags[t]; });
    if (displayTags.length === 0) return '';

    var html = '<div class="performance-section" style="margin-top:var(--space-lg);">';
    html += '<h3>载具标签</h3>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:var(--space-xs);">';
    displayTags.forEach(function (tag) {
      var label = TAG_LABELS[tag] || tag.replace(/_/g, ' ');
      html += '<span class="badge" style="background:rgba(52,152,219,0.12);color:#3498db;border-color:rgba(52,152,219,0.25);font-size:11px;">' + label + '</span>';
    });
    html += '</div></div>';
    return html;
  }

  function renderModificationsBlock(v) {
    if (!v.modifications || Object.keys(v.modifications).length === 0) return '';

    var categories = Object.keys(v.modifications);
    var html = '<div class="performance-section" style="margin-top:var(--space-lg);">';
    html += '<h3>改装选项 (' + categories.length + ' 类)</h3>';

    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var items = v.modifications[cat];
      if (!items || items.length === 0) continue;
      var nonStockCount = 0;
      for (var j = 0; j < items.length; j++) {
        if (items[j].name !== '无') nonStockCount++;
      }

      html += '<details style="margin-bottom:var(--space-xs);border:1px solid var(--color-sidebar-border);border-radius:var(--radius-sm);overflow:hidden;">';
      html += '<summary style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-xs) var(--space-sm);background:var(--color-glass-bg);cursor:pointer;user-select:none;list-style:none;">';
      html += '<span style="font-size:var(--font-size-sm);font-weight:var(--font-weight-medium);color:var(--color-text-primary);">' + Utils.escapeHtml(cat) + '</span>';
      html += '<span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">' + nonStockCount + ' 项</span>';
      html += '</summary>';

      for (var k = 0; k < items.length; k++) {
        var m = items[k];
        var priceStr = m.price > 0 ? '$' + Number(m.price).toLocaleString('en-US') : '免费';
        var isStock = m.name === '无';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px var(--space-sm);border-top:1px solid rgba(255,255,255,0.03);font-size:var(--font-size-xs);' + (isStock ? 'color:var(--color-text-muted);' : 'color:var(--color-text-secondary);') + '">' +
          '<span>' + (isStock ? '— 无（原厂）' : Utils.escapeHtml(m.name)) + '</span>' +
          '<span style="color:var(--color-gold);font-weight:var(--font-weight-medium);">' + priceStr + '</span>' +
        '</div>';
      }
      html += '</details>';
    }

    html += '</div>';
    return html;
  }

  function renderLiveriesBlock(v) {
    if (!v.liveries || v.liveries.length <= 1) return '';

    var model = (v.model_name || '').toLowerCase();
    var baseUrl = 'https://cdn-gta-images.antwen.cn/';

    var html = '<div class="performance-section" style="margin-top:var(--space-lg);">';
    html += '<h3>涂装 (' + (v.liveries.length - 1) + ' 款)</h3>';

    var showCount = Math.min(v.liveries.length, 12);

    html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-sm);">';
    for (var i = 0; i < showCount; i++) {
      var l = v.liveries[i];
      var isStock = l.name === '无';
      var imgUrl = l.image ? (baseUrl + l.image) : '';
      var priceStr = l.price > 0 ? '$' + Number(l.price).toLocaleString('en-US') : '免费';

      html += '<div style="background:var(--color-glass-bg);border:1px solid var(--color-sidebar-border);border-radius:var(--radius-sm);overflow:hidden;text-align:center;">';
      if (imgUrl) {
        html += '<div style="width:100%;aspect-ratio:16/9;background:var(--color-bg-tertiary);overflow:hidden;">' +
          '<img src="' + imgUrl + '" alt="' + Utils.escapeHtml(l.name) + '" loading="lazy" style="width:100%;height:100%;object-fit:contain;" onerror="this.parentElement.innerHTML=\'<div style=\\\'display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-text-muted);font-size:10px;\\\'>无预览</div>\'">' +
        '</div>';
      }
      html += '<div style="padding:var(--space-xs);">' +
        '<div style="font-size:var(--font-size-xs);color:' + (isStock ? 'var(--color-text-muted)' : 'var(--color-text-secondary)') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + Utils.escapeHtml(l.name) + '">' + (isStock ? '无（原厂）' : Utils.escapeHtml(l.name)) + '</div>' +
        '<div style="font-size:10px;color:var(--color-gold);font-weight:var(--font-weight-medium);">' + priceStr + '</div>' +
      '</div></div>';
    }
    html += '</div>';

    if (v.liveries.length > showCount) {
      html += '<p style="font-size:var(--font-size-xs);color:var(--color-text-muted);text-align:center;margin-top:var(--space-sm);">还有 ' + (v.liveries.length - showCount) + ' 款涂装未显示</p>';
    }

    html += '</div>';
    return html;
  }

  function renderScreenshotsBlock(v) {
    if (!v.screenshots) return '';
    var labels = { front_quarter: '前侧', front: '正面', side: '侧面', rear: '后面', rear_quarter: '后侧', top: '顶部', engine: '引擎', inside: '内饰', underside: '底盘' };
    var urls = [];
    for (var k in labels) {
      if (v.screenshots[k]) urls.push({ key: k, label: labels[k], url: v.screenshots[k] });
    }
    if (urls.length === 0) return '';

    var html = '<div class="performance-section" style="margin-top:var(--space-lg);">';
    html += '<h3>多角度截图 (' + urls.length + ')</h3>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-sm);">';
    for (var i = 0; i < urls.length; i++) {
      var img = urls[i];
      var imgId = 'ss-img-' + i + '-' + (currentVehicleId || 'x');
      html += '<div style="background:var(--color-glass-bg);border:1px solid var(--color-sidebar-border);border-radius:var(--radius-sm);overflow:hidden;cursor:pointer;" onclick="var el=document.getElementById(\'' + imgId + '\');el.style.display=el.style.display===\'none\'?\'block\':\'none\';var fb=document.getElementById(\'' + imgId + '-fb\');if(fb)fb.style.display=fb.style.display===\'none\'?\'flex\':\'none\';">';
      html += '<div style="aspect-ratio:16/9;background:var(--color-bg-tertiary);overflow:hidden;position:relative;">' +
        '<img src="' + img.url + '" alt="' + img.label + '" loading="lazy" style="width:100%;height:100%;object-fit:contain;" onerror="this.parentElement.innerHTML=\'<div style=\\\'display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-text-muted);font-size:var(--font-size-xs);\\\'>加载失败</div>\'">' +
      '</div>' +
      '<div style="padding:var(--space-xs);font-size:var(--font-size-xs);color:var(--color-text-muted);text-align:center;">' + img.label + '</div>' +
      // Fullscreen overlay
      '<div id="' + imgId + '-fb" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,0.92);align-items:center;justify-content:center;padding:20px;" onclick="this.style.display=\'none\'">' +
        '<img src="' + img.url + '" style="max-width:95vw;max-height:95vh;object-fit:contain;border-radius:var(--radius-md);" onclick="event.stopPropagation()">' +
        '<button style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.15);color:#fff;border:none;border-radius:50%;width:36px;height:36px;font-size:18px;cursor:pointer;line-height:1;" onclick="var fb=document.getElementById(\'' + imgId + '-fb\');if(fb)fb.style.display=\'none\'">✕</button>' +
      '</div>' +
      '</div>';
    }
    html += '</div></div>';
    return html;
  }

  async function fetchXiaoheiheData() {
    // Xiaoheihe scraping — fetches additional data from the web proxy
    try {
      var url = '/api/xiaoheihe/vehicle?name=' + encodeURIComponent(currentVehicle.name);
      var resp = await fetch(url);
      if (!resp.ok) return;
      var data = await resp.json();

      if (data.error || Object.keys(data).length <= 2) return;

      var container = document.getElementById('vehicle-detail-content');
      if (!container) return;

      var extraHtml = '<div style="margin-top:var(--space-lg);background:var(--color-glass-bg);border:var(--border-thin);border-radius:var(--radius-md);padding:var(--space-md);">';
      extraHtml += '<div style="font-size:var(--font-size-xs);color:var(--color-gold);margin-bottom:var(--space-sm);">小黑盒数据</div>';

      // --- Cross-reference names ---
      if (data.name_chs || data.name_eng || data.name_zht) {
        extraHtml += '<div style="display:flex;flex-wrap:wrap;gap:var(--space-xs);margin-bottom:var(--space-sm);">';
        if (data.name_chs) extraHtml += '<span class="badge" style="font-size:11px">' + Utils.escapeHtml(data.name_chs) + '</span>';
        if (data.name_zht) extraHtml += '<span class="badge" style="font-size:11px">' + Utils.escapeHtml(data.name_zht) + '</span>';
        if (data.name_eng) extraHtml += '<span class="badge" style="font-size:11px">' + Utils.escapeHtml(data.name_eng) + '</span>';
        extraHtml += '</div>';
      }

      // --- Supplementary data (only fields NOT already in main render) ---
      extraHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;">';
      // Wholesale price
      if (data.price_wholesale) {
        extraHtml += '<div style="display:flex;justify-content:space-between;font-size:var(--font-size-xs);">' +
          '<span style="color:var(--color-text-muted)">批发价</span>' +
          '<span style="color:var(--color-text-primary);font-weight:var(--font-weight-medium)">$' + Number(data.price_wholesale).toLocaleString('en-US') + '</span></div>';
      }
      // Top speed raw km/h
      if (data.top_speed_raw) {
        extraHtml += '<div style="display:flex;justify-content:space-between;font-size:var(--font-size-xs);">' +
          '<span style="color:var(--color-text-muted)">极速(km/h)</span>' +
          '<span style="color:var(--color-text-primary);font-weight:var(--font-weight-medium)">' + Utils.escapeHtml(data.top_speed_raw) + '</span></div>';
      }
      extraHtml += '</div>';

      // --- Notes ---
      if (data.notes) {
        extraHtml += '<div style="margin-top:var(--space-sm);padding-top:var(--space-sm);border-top:1px solid var(--color-sidebar-border);font-size:var(--font-size-xs);color:var(--color-text-muted);">';
        extraHtml += '<span style="color:var(--color-gold);">备注：</span>' + Utils.escapeHtml(data.notes);
        extraHtml += '</div>';
      }

      extraHtml += '</div>';

      var links = container.querySelector('.detail-quick-links');
      if (links) {
        links.insertAdjacentHTML('beforebegin', extraHtml);
      }
    } catch (e) {
      // Silently fail — Xiaoheihe data is optional
    }
  }

  function renderPerformanceBars(perf) {
    if (!perf) return '<p class="text-muted">暂无性能数据</p>';

    var bars = ['speed', 'acceleration', 'braking', 'traction'];
    var labels = { speed: '速度', acceleration: '加速', braking: '刹车', traction: '抓地' };
    var colors = {
      speed: 'linear-gradient(90deg, #e74c3c, #f39c12)',
      acceleration: 'linear-gradient(90deg, #3498db, #2ecc71)',
      braking: 'linear-gradient(90deg, #f39c12, #e74c3c)',
      traction: 'linear-gradient(90deg, #2ecc71, #f39c12)'
    };

    var html = '';
    bars.forEach(function (key) {
      var val = perf[key] || 0;
      html +=
        '<div class="stat-bar">' +
          '<span class="stat-bar-label">' + (labels[key] || key) + '</span>' +
          '<div class="stat-bar-track"><div class="stat-bar-fill" style="width:' + val + '%;background:' + (colors[key] || 'var(--color-gold)') + '"></div></div>' +
          '<span class="stat-bar-value">' + val + '</span>' +
        '</div>';
    });
    return html;
  }

  async function updateOwnershipButton() {
    var toggle = document.getElementById('ownership-toggle');
    if (!toggle || !currentVehicleId) return;

    try {
      await GTA.db.ready();
      var existing = await GTA.db.ownedVehicles.get(currentVehicleId);
      var isOwned = !!existing;

      toggle.innerHTML = isOwned
        ? '<button class="btn btn-danger" id="btn-remove-vehicle" style="flex:1">移出收藏</button>'
        : '<button class="btn btn-success" id="btn-add-vehicle" style="flex:1">加入收藏</button>';

      if (isOwned) {
        document.getElementById('btn-remove-vehicle').addEventListener('click', removeVehicle);
      } else {
        document.getElementById('btn-add-vehicle').addEventListener('click', addVehicle);
      }
    } catch (e) {
      console.error('[VehicleDetail] Error updating ownership:', e);
    }
  }

  async function addVehicle() {
    try {
      await GTA.db.ready();
      await GTA.db.ownedVehicles.put({
        vehicleId: currentVehicleId,
        addedAt: Date.now()
      });
      GTA.Toast.success('已加入收藏！');
      GTA.EventBus.emit('vehicle:added', { vehicleId: currentVehicleId });
      updateOwnershipButton();
    } catch (e) {
      console.error('[VehicleDetail] Error adding:', e);
      GTA.Toast.error('添加失败');
    }
  }

  async function removeVehicle() {
    GTA.Modal.show({
      title: '确认移除',
      body: '<p>确定要从收藏中移除 <strong>' + Utils.escapeHtml(currentVehicle ? currentVehicle.name : '') + '</strong> 吗？</p><p class="text-sm text-muted">相关的改装记录和照片也会被删除。</p>',
      confirmText: '确认移除',
      cancelText: '取消',
      onConfirm: async function () {
        try {
          await GTA.db.ready();
          await GTA.db.ownedVehicles.delete(currentVehicleId);
          GTA.Toast.info('已移出收藏');
          GTA.EventBus.emit('vehicle:removed', { vehicleId: currentVehicleId });
          updateOwnershipButton();
        } catch (e) {
          console.error('[VehicleDetail] Error removing:', e);
          GTA.Toast.error('移除失败');
        }
      }
    });
  }

  async function addToGarage() {
    try {
      await GTA.db.ready();
      var garages = await GTA.db.garages.toArray();

      if (garages.length === 0) {
        GTA.Modal.show({
          title: '没有车库',
          body: '<p>还没有创建任何车库。</p><p>是否前往车库页面创建？</p>',
          confirmText: '前往车库',
          cancelText: '取消',
          onConfirm: function () {
            GTA.Router.navigate('garage');
          }
        });
        return;
      }

      var optionsHtml = '<div class="add-vehicle-list">';
      garages.forEach(function (g) {
        optionsHtml +=
          '<div class="add-vehicle-item" data-garage-id="' + g.id + '">' +
            '<span>' + Utils.escapeHtml(g.name) + '</span>' +
          '</div>';
      });
      optionsHtml += '</div>';

      GTA.Modal.show({
        title: '选择车库',
        body: optionsHtml,
        confirmText: '关闭',
        showCancel: false,
        onConfirm: function () { /* Just close */ }
      });

      // Add click listeners after modal body is set
      setTimeout(function () {
        var items = document.querySelectorAll('.add-vehicle-item');
        items.forEach(function (item) {
          item.addEventListener('click', async function () {
            var garageId = parseInt(this.getAttribute('data-garage-id'));
            try {
              // Check if already in garage
              var existing = await GTA.db.garageVehicles
                .where({ garageId: garageId, vehicleId: currentVehicleId })
                .first();

              if (existing) {
                GTA.Toast.info('该载具已在此车库中');
                return;
              }

              // Get max sortOrder
              var maxSort = await GTA.db.garageVehicles
                .where('garageId').equals(garageId)
                .toArray();
              var nextSort = maxSort.length > 0 ? Math.max.apply(null, maxSort.map(function (r) { return r.sortOrder || 0; })) + 1 : 0;

              await GTA.db.garageVehicles.add({
                garageId: garageId,
                vehicleId: currentVehicleId,
                sortOrder: nextSort
              });

              GTA.Toast.success('已添加到车库！');
              GTA.Modal.hide(true);
              GTA.EventBus.emit('garage:changed', { garageId: garageId });
            } catch (e) {
              console.error('[VehicleDetail] Error adding to garage:', e);
              GTA.Toast.error('添加失败');
            }
          });
        });
      }, 100);

    } catch (e) {
      console.error('[VehicleDetail] Error:', e);
    }
  }

  async function renderGarageInfo() {
    var container = document.getElementById('detail-garage-info');
    if (!container || !currentVehicleId) return;

    try {
      await GTA.db.ready();
      var records = await GTA.db.garageVehicles
        .where('vehicleId')
        .equals(currentVehicleId)
        .toArray();

      var garageEntries = [];
      for (var i = 0; i < records.length; i++) {
        var garage = await GTA.db.garages.get(records[i].garageId);
        if (garage) garageEntries.push(garage);
      }

      var html = '<div class="detail-garage-section">' +
        '<div class="detail-garage-label">所属车库</div>';

      if (garageEntries.length === 0) {
        html += '<span class="detail-garage-none">未加入车库</span>';
      } else {
        html += '<div class="detail-garage-list">';
        garageEntries.forEach(function (g) {
          html += '<a class="detail-garage-link" href="#/garage/' + g.id + '" data-garage-id="' + g.id + '">' +
            Utils.escapeHtml(g.name) + '</a>';
        });
        html += '</div>';
      }
      html += '</div>';
      container.innerHTML = html;

      if (garageEntries.length > 0) {
        container.querySelectorAll('.detail-garage-link').forEach(function (link) {
          link.addEventListener('click', function (e) {
            e.preventDefault();
            var garageId = parseInt(this.getAttribute('data-garage-id'));
            GTA.Router.navigate('garage/' + garageId);
          });
        });
      }
    } catch (e) {
      console.error('[VehicleDetail] Error loading garage info:', e);
      container.innerHTML = '';
    }
  }

  function updateStreetCarBadge() {
    if (!currentVehicle || !GTA.VehicleCard.isStreetCar) return;
    if (GTA.VehicleCard.isStreetCar(currentVehicle)) {
      var titleEl = document.querySelector('.detail-title');
      if (titleEl) {
        titleEl.insertAdjacentHTML('beforeend', ' <span class="badge badge-street-car">街车</span>');
      }
    }
  }

  function renderExtraSections() {
    if (!currentVehicle) return;
    var extra = [];

    // Blacklist
    if (blacklistData && blacklistData.blacklist_models) {
      var model = (currentVehicle.model_name || '').toLowerCase();
      if (blacklistData.blacklist_models.indexOf(model) !== -1) {
        extra.push(renderBlacklistWarning());
      }
    }

    // Parts restrictions
    if (partsRestrictData && currentVehicle.model_name) {
      var parts = partsRestrictData[currentVehicle.model_name.toUpperCase()];
      if (parts) {
        extra.push(renderPartsRestrictions(parts));
      }
    }

    // Street car colors
    if (streetCarColorsData && currentVehicle.model_name) {
      var colors = streetCarColorsData.find(function (c) {
        return c.model_name.toUpperCase() === currentVehicle.model_name.toUpperCase();
      });
      if (colors && colors.color_rows && colors.color_rows.length > 0) {
        extra.push(renderStreetCarColors(colors));
      }
    }

    if (extra.length === 0) return;

    // Append after detail-content-below
    var below = document.querySelector('.detail-content-below');
    if (below) {
      below.insertAdjacentHTML('beforeend', '<div class="detail-full-width">' + extra.join('') + '</div>');
    }
  }

  function renderBlacklistWarning() {
    return '<div class="blacklist-warning" style="margin-top:var(--space-lg);">' +
      '<h3>⚠️ 载具黑名单</h3>' +
      '<p>此载具因模型特殊原因被列入黑名单，部分功能可能受限。</p>' +
    '</div>';
  }

  function renderPartsRestrictions(parts) {
    var html = '<div class="performance-section" style="margin-top:var(--space-lg);">' +
      '<h3>隐藏配件位 (' + parts.total_slots + ' 槽位)</h3>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;">';
    parts.restrictions.forEach(function (r) {
      html += '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.03);font-size:var(--font-size-sm);">' +
        '<span class="parts-slot">槽位 ' + r.slot + '</span>' +
        '<span style="color:var(--color-text-secondary)">' + Utils.escapeHtml(r.part) + '</span>' +
      '</div>';
    });
    html += '</div></div>';
    return html;
  }

  function renderStreetCarColors(colors) {
    var html = '<div class="street-car-colors">' +
      '<div class="performance-section"><h3>街车稀有配色 (' + colors.color_rows.length + ' 种)</h3></div>' +
      '<div class="street-color-table">' +
        '<div class="street-color-header"><span>主色</span><span>副色</span><span>珠光</span><span>获取</span></div>';

    colors.color_rows.forEach(function (row) {
      var primary = row.primary || {};
      var secondary = row.secondary || {};
      var pearlescent = row.pearlescent || {};

      html += '<div class="street-color-row">' +
        '<div class="color-cell" style="background:' + (primary.hex || '#333') + ';">' +
          '<div class="color-cell-text"><span class="color-cell-name" style="color:' + (isLightColor(primary.hex) ? '#000' : '#fff') + ';">' + (primary.name_cn || primary.name || '-') + '</span></div>' +
        '</div>' +
        '<div class="color-cell" style="background:' + (secondary.hex || '#333') + ';">' +
          '<div class="color-cell-text"><span class="color-cell-name" style="color:' + (isLightColor(secondary.hex) ? '#000' : '#fff') + ';">' + (secondary.name_cn || secondary.name || '-') + '</span></div>' +
        '</div>' +
        '<div class="color-cell-text" style="padding:8px;font-size:11px;color:var(--color-text-secondary);">' + (pearlescent.name_cn || pearlescent.name || '-') + '</div>' +
        '<div class="color-cell-text" style="padding:8px;font-size:11px;color:var(--color-text-secondary);">' + (primary.unlock || '-') + '</div>' +
      '</div>';
    });

    html += '</div></div>';
    return html;
  }

  function isLightColor(hex) {
    if (!hex) return false;
    var r = parseInt(hex.slice(1, 3), 16) || 0;
    var g = parseInt(hex.slice(3, 5), 16) || 0;
    var b = parseInt(hex.slice(5, 7), 16) || 0;
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  }

  return { init: init, destroy: destroy };
})();
