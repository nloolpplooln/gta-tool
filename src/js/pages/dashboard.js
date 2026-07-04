/* ===== Dashboard Page ===== */
window.GTA = window.GTA || {};

GTA.Dashboard = (function () {
  var Utils = GTA.Utils;
  var Catalog = GTA.VehicleCatalog;
  var StatsCalc = GTA.Stats;

  function init() {
    GTA.log('[Dashboard] Init');
    refresh();
  }

  function destroy() {
    // Cleanup if needed
  }

  async function refresh() {
    try {
      await GTA.db.ready();
      var stats = await StatsCalc.getDashboardStats();

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

  function updateStatCards(stats) {
    var ownedEl = document.getElementById('stat-owned');
    var assetsEl = document.getElementById('stat-assets');
    var discontinuedEl = document.getElementById('stat-discontinued');
    var monthlyEl = document.getElementById('stat-monthly');

    if (ownedEl) {
      ownedEl.textContent = stats.ownedCount;
    }
    var ownedLabel = document.getElementById('stat-owned-label');
    if (ownedLabel) {
      ownedLabel.textContent = '拥有载具 / 总计 ' + stats.totalCount;
    }
    if (assetsEl) {
      assetsEl.textContent = Utils.formatCurrency(stats.totalValue);
      if (stats.modsValue > 0) {
        assetsEl.setAttribute('title', '购车 ' + Utils.formatCurrency(stats.vehicleValue) + ' + 改装 ' + Utils.formatCurrency(stats.modsValue));
        var parentCard = assetsEl.closest('.stat-card');
        if (parentCard) {
          var label = parentCard.querySelector('.stat-card-label');
          if (label) label.textContent = '购车 ' + Utils.formatCurrency(stats.vehicleValue) + ' + 改装 ' + Utils.formatCurrency(stats.modsValue);
        }
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

      item.innerHTML =
        (Catalog.isDiscontinued(vehicle.name) ? '<span class="badge badge-discontinued">绝版</span>' : '') +
        '<span style="flex:1">' + Utils.escapeHtml(vehicle.name) + '</span>' +
        '<span style="color:var(--color-gold);font-family:var(--font-mono);font-size:var(--font-size-xs)">' + Utils.formatCurrency(vehicle.price_buy) + '</span>' +
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

  // Listen for vehicle changes to auto-refresh
  GTA.EventBus.on('vehicle:added', refresh);
  GTA.EventBus.on('vehicle:removed', refresh);
  GTA.EventBus.on('catalog:loaded', refresh);

  return { init: init, destroy: destroy, refresh: refresh };
})();
