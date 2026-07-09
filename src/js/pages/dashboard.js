/* ===== Dashboard Page ===== */
window.GTA = window.GTA || {};

GTA.Dashboard = (function () {
  var Utils = GTA.Utils;
  var Catalog = GTA.VehicleCatalog;
  var StatsCalc = GTA.Stats;

  function init() {
    GTA.log('[Dashboard] Init');
    refresh();
    initCareer();
  }

  function destroy() {
    // Cleanup if needed
  }

  async function refresh() {
    try {
      await GTA.db.ready();
      var stats = await StatsCalc.getDashboardStats();

      // Load player name
      loadPlayerName();
      // Update stat cards
      updateStatCards(stats);
      // Update recent additions
      updateRecentAdditions(stats);
      // Update unowned vehicles scroll
      updateUnownedVehicles();

    } catch (err) {
      console.error('[Dashboard] Error:', err);
    }
  }

  async function loadPlayerName() {
    try {
      var setting = await GTA.db.settings.get('playerName');
      var el = document.getElementById('dashboard-player-name');
      if (el && setting && setting.value) {
        el.textContent = setting.value;
      } else if (el) {
        el.textContent = 'GTA 玩家';
      }
    } catch (e) {}
  }

  function updateStatCards(stats) {
    var ownedEl = document.getElementById('stat-owned');
    var assetsEl = document.getElementById('stat-assets');
    var discontinuedEl = document.getElementById('stat-discontinued');
    var monthlyEl = document.getElementById('stat-monthly');

    if (ownedEl) {
      ownedEl.textContent = stats.ownedCount;
    }
    if (assetsEl) {
      assetsEl.textContent = Utils.formatCurrency(stats.totalValue);
      if (stats.modsValue > 0) {
        assetsEl.setAttribute('title', '购车 ' + Utils.formatCurrency(stats.vehicleValue) + ' + 改装 ' + Utils.formatCurrency(stats.modsValue));
      }
    }
    if (discontinuedEl) discontinuedEl.textContent = stats.discontinuedCount;
    if (monthlyEl) monthlyEl.textContent = stats.newThisMonth;
  }

  function updateRecentAdditions(stats) {
    var container = document.getElementById('recent-additions-list');
    if (!container) return;

    if (!stats.recentAdditions || stats.recentAdditions.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>还没有收藏任何载具，去载具百科看看吧！</p></div>';
      return;
    }

    container.innerHTML = '';
    stats.recentAdditions.forEach(function (rec) {
      var vehicle = Catalog.getById(rec.vehicleId);
      if (!vehicle) return;

      var item = document.createElement('div');
      item.className = 'addition-item';
      item.style.cursor = 'pointer';
      item.addEventListener('click', function () {
        GTA.Router.navigate('vehicle/' + vehicle.id);
      });

      var thumb = vehicle.thumbnail || '';
      item.innerHTML =
        (thumb ? '<img class="addition-thumb" src="' + thumb + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '<div class="addition-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.2rem;opacity:0.3;">🏎️</div>') +
        '<div class="addition-info">' +
          '<div class="addition-name">' + Utils.escapeHtml(vehicle.name) + (Catalog.isDiscontinued(vehicle.name) ? ' <span class="badge badge-discontinued">绝版</span>' : '') + '</div>' +
          '<div class="addition-meta">' + Utils.escapeHtml(vehicle.brand) + ' · ' + Utils.formatCurrency(vehicle.price_buy) + '</div>' +
        '</div>' +
        '<span class="addition-date">' + Utils.formatDate(rec.addedAt) + '</span>';

      container.appendChild(item);
    });
  }

  function updateUnownedVehicles() {
    var scroll = document.getElementById('unowned-scroll');
    var totalEl = document.getElementById('unowned-total');
    var emptyEl = document.getElementById('unowned-empty');
    if (!scroll) return;

    // Get all vehicles not yet owned
    var allVehicles = Catalog.getAll();
    var ownedSet = new Set();
    GTA.db.ownedVehicles.toArray().then(function (owned) {
      owned.forEach(function (r) { ownedSet.add(r.vehicleId); });

      var unowned = allVehicles.filter(function (v) { return !ownedSet.has(v.id); });

      // Calculate total remaining cost
      var remainingTotal = 0;
      unowned.forEach(function (v) { remainingTotal += (v.price_buy || 0); });

      if (totalEl) {
        totalEl.textContent = 'GTA$ ' + Utils.formatCurrency(remainingTotal);
      }

      if (emptyEl) {
        emptyEl.classList.toggle('d-none', unowned.length !== 0);
      }

      var scrollWrapper = document.querySelector('.unowned-scroll-wrapper');
      if (scrollWrapper) {
        scrollWrapper.style.display = unowned.length === 0 ? 'none' : '';
      }

      // Render mini cards
      var html = '';
      unowned.forEach(function (v) {
        var thumbnail = v.thumbnail || '';
        var discontinuedBadge = Catalog.isDiscontinued(v.name)
          ? '<span class="badge badge-discontinued" style="position:absolute;top:4px;right:4px;font-size:9px;">绝版</span>'
          : '';

        html +=
          '<div class="unowned-mini-card" data-vehicle-id="' + v.id + '">' +
            '<div class="mini-card-img" style="position:relative;">' +
              (thumbnail
                ? '<img src="' + thumbnail + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
                : '<span style="opacity:0.3;">' + (Catalog.isDiscontinued(v.name) ? '🚫' : '🏎️') + '</span>') +
              discontinuedBadge +
            '</div>' +
            '<div class="mini-card-body">' +
              '<div class="mini-card-name" title="' + Utils.escapeHtml(v.name) + '">' + Utils.escapeHtml(v.name) + '</div>' +
              '<div class="mini-card-brand">' + Utils.escapeHtml(v.brand) + ' · ' + Utils.escapeHtml(v.type) + '</div>' +
              '<div class="mini-card-price">' + Utils.formatCurrency(v.price_buy) + '</div>' +
            '</div>' +
          '</div>';
      });

      // Duplicate for seamless marquee loop
      scroll.innerHTML = html + html;

      // Bind click events
      scroll.querySelectorAll('.unowned-mini-card').forEach(function (card) {
        card.addEventListener('click', function () {
          var vid = this.getAttribute('data-vehicle-id');
          if (vid) GTA.Router.navigate('vehicle/' + vid);
        });
      });
    });
  }

  // ===== Career Lookup (HQSHI) =====
  var careerQuerying = false;

  var CAREER_FIELD_GROUPS = [
    {
      title: '资产 / 财务',
      icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
      fields: ['存款', '总收入', '总支出', '收支差距', '差事收入', '差事入场费', '其他收入', '卖车收入', '拾取金额', '分享金额', '下注收入', '下注花费'],
      highlight: ['存款']
    },
    {
      title: '战斗',
      icon: 'M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2',
      fields: ['总玩家击杀', '角色玩家击杀'],
      highlight: []
    },
    {
      title: '游玩',
      icon: 'M12 6v6l4 2M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
      fields: ['在线时长', '总在线时长', '平均每日在线时间', '平均升级时间', '路上载具最高速度'],
      highlight: []
    }
  ];

  var CAREER_META_FIELDS = ['数据更新时间', '规则版本', '索引', '提示'];

  function careerEsc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function initCareer() {
    var container = document.getElementById('dashboard-career');
    if (!container) return;
    container.innerHTML =
      '<div class="career-dash">' +
        '<div class="career-dash-header">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>' +
          '<span>生涯查询</span>' +
          '<span class="career-dash-source">数据来源 HQSHI</span>' +
        '</div>' +
        '<div class="career-dash-search">' +
          '<input type="text" id="dash-career-input" class="form-input" placeholder="输入玩家昵称，如 oolpploo" autocomplete="off" spellcheck="false">' +
          '<button id="dash-career-btn" class="btn btn-primary btn-sm">查询</button>' +
        '</div>' +
        '<div id="dash-career-result"></div>' +
      '</div>';

    var btn = container.querySelector('#dash-career-btn');
    var input = container.querySelector('#dash-career-input');
    if (btn) btn.addEventListener('click', doCareerQuery);
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doCareerQuery();
      });
    }
  }

  async function doCareerQuery() {
    if (careerQuerying) return;
    var input = document.getElementById('dash-career-input');
    var btn = document.getElementById('dash-career-btn');
    var name = input ? input.value.trim() : '';
    if (!name) {
      GTA.Toast.warning('请输入玩家昵称');
      return;
    }

    careerQuerying = true;
    if (btn) { btn.disabled = true; btn.textContent = '查询中…'; }
    showCareerLoading(name);

    try {
      var res = await fetchCareerData(name);
      if (res && res.success) {
        renderCareerResult(name, res.data);
      } else {
        renderCareerError(name, res || {});
      }
    } catch (e) {
      renderCareerError(name, { error: (e && e.message) || String(e) });
    } finally {
      careerQuerying = false;
      if (btn) { btn.disabled = false; btn.textContent = '查询'; }
    }
  }

  async function fetchCareerData(nickname) {
    if (window.electronAPI && typeof window.electronAPI.queryCareer === 'function') {
      return await window.electronAPI.queryCareer(nickname, {});
    }
    return { success: false, error: 'not_desktop', hint: '请在桌面版 VaultGTA 中使用本功能' };
  }

  function showCareerLoading(name) {
    var result = document.getElementById('dash-career-result');
    if (!result) return;
    collapseRecent(false);
    result.innerHTML =
      '<div class="career-dash-loading">' +
        '<div class="career-dash-spinner"></div>' +
        '<span>正在查询 “' + careerEsc(name) + '” …</span>' +
      '</div>';
  }

  function careerTile(label, value, highlight) {
    return '<div class="career-dash-tile' + (highlight ? ' career-dash-tile-hl' : '') + '">' +
        '<div class="career-dash-tile-label">' + careerEsc(label) + '</div>' +
        '<div class="career-dash-tile-value">' + careerEsc(value) + '</div>' +
      '</div>';
  }

  function collapseRecent(show) {
    var recent = document.querySelector('.dashboard-recent');
    if (!recent) return;
    if (show) {
      recent.classList.add('career-active');
    } else {
      recent.classList.remove('career-active');
    }
  }

  function renderCareerResult(name, data) {
    var result = document.getElementById('dash-career-result');
    if (!result) return;
    collapseRecent(true);

    var nickname = data['昵称'] || name;
    var level = data['等级'];
    var crew = data['帮会'];
    var platform = data['平台'];
    var created = data['角色创建'];

    var html = '<div class="career-dash-card">';
    html +=
      '<div class="career-dash-overview">' +
        '<div class="career-dash-overview-main">' +
          '<div class="career-dash-name">' + careerEsc(nickname) + '</div>' +
          '<div class="career-dash-sub">' +
            (crew ? '<span class="career-dash-chip">帮会 ' + careerEsc(crew) + '</span>' : '') +
            (platform ? '<span class="career-dash-chip">' + careerEsc(platform) + '</span>' : '') +
            (created ? '<span class="career-dash-chip">创建于 ' + careerEsc(created) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="career-dash-overview-right">' +
          (level != null && level !== ''
            ? '<div class="career-dash-level"><span class="career-dash-level-num">' + careerEsc(level) + '</span><span class="career-dash-level-label">等级</span></div>'
            : '') +
          '<button id="dash-career-refresh-btn" class="btn btn-ghost btn-sm" title="获取最新数据" style="margin-left:8px;padding:2px 6px;font-size:10px;">🔄 刷新</button>' +
        '</div>' +
      '</div>';

    CAREER_FIELD_GROUPS.forEach(function (g) {
      var tiles = '';
      g.fields.forEach(function (f) {
        if (data[f] != null && data[f] !== '') {
          tiles += careerTile(f, data[f], g.highlight.indexOf(f) !== -1);
        }
      });
      if (!tiles) return;
      html +=
        '<div class="career-dash-section">' +
          '<div class="career-dash-section-title">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="' + g.icon + '"/></svg>' +
            '<span>' + careerEsc(g.title) + '</span>' +
          '</div>' +
          '<div class="career-dash-grid">' + tiles + '</div>' +
        '</div>';
    });

    var meta = '';
    CAREER_META_FIELDS.forEach(function (f) {
      if (data[f] != null && data[f] !== '') {
        meta += '<span class="career-dash-meta-item"><b>' + careerEsc(f) + '：</b>' + careerEsc(data[f]) + '</span>';
      }
    });
    if (meta) html += '<div class="career-dash-meta">' + meta + '</div>';

    html += '<div class="career-dash-close-wrap"><button id="dash-career-close-btn" class="btn btn-ghost btn-sm" style="width:100%;font-size:11px;opacity:0.5;">收起 ▲</button></div>';

    html += '</div>';
    result.innerHTML = html;

    // Silently refresh snapshot for next visit
    if (window.electronAPI && window.electronAPI.requestCareerSnapshot) {
      window.electronAPI.requestCareerSnapshot(nickname, 'pcalt').catch(function () {});
    }

    var refreshBtn = result.querySelector('#dash-career-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        refreshBtn.disabled = true;
        refreshBtn.textContent = '⏳';
        requestCareerRefresh(nickname, refreshBtn);
      });
    }

    var closeBtn = result.querySelector('#dash-career-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        result.innerHTML = '';
        collapseRecent(false);
      });
    }
  }

  function renderCareerError(name, res) {
    var result = document.getElementById('dash-career-result');
    if (!result) return;
    collapseRecent(false);

    var hint = res.hint || res.error || '查询失败';
    var isEmpty = res.error === 'empty';
    var isNotDesktop = res.error === 'not_desktop';

    var html =
      '<div class="career-dash-empty">' +
        '<div class="career-dash-empty-icon">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' +
        '</div>' +
        '<div class="career-dash-empty-title">' + (isEmpty ? '暂无数据' : '未能查询') + '</div>' +
        '<div class="career-dash-empty-text">' + careerEsc(hint) + '</div>';

    if (isEmpty && !isNotDesktop) {
      html += '<button id="dash-career-post-btn" class="btn btn-primary btn-sm" style="margin-top:12px;">请求生成数据</button>';
    }
    html += '</div>';
    result.innerHTML = html;

    if (isEmpty && !isNotDesktop) {
      var postBtn = result.querySelector('#dash-career-post-btn');
      if (postBtn) {
        postBtn.addEventListener('click', function () {
          requestCareerSnapshot(name, postBtn);
        });
      }
    }
  }

  async function requestCareerRefresh(name, btn) {
    try {
      await window.electronAPI.requestCareerSnapshot(name, 'pcalt');
    } catch (e) { /* ignore errors, try fetching anyway */ }

    GTA.Toast.info('正在获取最新数据…');
    var retryCount = 0;
    var maxRetries = 5;

    function tryRefresh(delay) {
      setTimeout(function () {
        retryCount++;
        if (btn) btn.textContent = retryCount + '/' + maxRetries;

        fetchCareerData(name).then(function (res) {
          if (res && res.success) {
            renderCareerResult(name, res.data);
            if (btn) { btn.disabled = false; btn.textContent = '🔄 刷新'; }
            GTA.Toast.info('数据已更新');
          } else if (retryCount < maxRetries) {
            tryRefresh(5000);
          } else {
            if (btn) { btn.disabled = false; btn.textContent = '🔄 刷新'; }
            GTA.Toast.error('未能获取最新数据，请稍后重试');
          }
        }).catch(function () {
          if (retryCount < maxRetries) {
            tryRefresh(5000);
          } else {
            if (btn) { btn.disabled = false; btn.textContent = '🔄 刷新'; }
            GTA.Toast.error('网络异常，请稍后重试');
          }
        });
      }, delay);
    }

    tryRefresh(10000);
  }

  async function requestCareerSnapshot(name, btn) {
    if (!(window.electronAPI && typeof window.electronAPI.requestCareerSnapshot === 'function')) {
      GTA.Toast.warning('请在桌面版中使用');
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = '请求中…'; }
    try {
      var res = await window.electronAPI.requestCareerSnapshot(name, 'pcalt');
      if (res && res.success) {
        GTA.Toast.info('数据请求已提交，15秒后开始自动查询…');
        if (btn) { btn.disabled = true; btn.textContent = '等待15秒...'; }

        // Retry loop: first try at 15s, then every 5s up to 4 more times
        var retryCount = 0;
        var maxRetries = 5;

        function retryQuery(delay) {
          setTimeout(function () {
            retryCount++;
            var b = document.getElementById('dash-career-post-btn');
            if (b) { b.textContent = '自动查询 ' + retryCount + '/' + maxRetries + '…'; }

            var input = document.getElementById('dash-career-input');
            if (input) input.value = name;

            // Call doCareerQuery but bypass the internal button state
            fetchCareerData(name).then(function (res) {
              if (res && res.success) {
                if (b) { b.disabled = false; b.textContent = '请求生成数据'; }
                renderCareerResult(name, res.data);
              } else if (retryCount < maxRetries) {
                retryQuery(5000);
              } else {
                if (b) { b.disabled = false; b.textContent = '请求生成数据'; }
                renderCareerError(name, res || {});
              }
            }).catch(function (e) {
              if (retryCount < maxRetries) {
                retryQuery(5000);
              } else {
                if (b) { b.disabled = false; b.textContent = '请求生成数据'; }
                renderCareerError(name, { error: (e && e.message) || String(e) });
              }
            });
          }, delay);
        }

        retryQuery(15000);
      } else {
        GTA.Toast.error('请求失败：' + ((res && (res.error || res.hint)) || '未知错误'));
        if (btn) { btn.disabled = false; btn.textContent = '请求生成数据'; }
      }
    } catch (e) {
      GTA.Toast.error('请求失败：' + ((e && e.message) || e));
      if (btn) { btn.disabled = false; btn.textContent = '请求生成数据'; }
    }
  }

  // Listen for vehicle changes to auto-refresh
  GTA.EventBus.on('vehicle:added', refresh);
  GTA.EventBus.on('vehicle:removed', refresh);
  GTA.EventBus.on('catalog:loaded', refresh);

  return { init: init, destroy: destroy, refresh: refresh };
})();
