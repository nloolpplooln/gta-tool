/* ===== Modifications Archive Page ===== */
window.GTA = window.GTA || {};

GTA.Modifications = (function () {
  var Utils = GTA.Utils;
  var Catalog = GTA.VehicleCatalog;
  var currentVehicleId = null;
  var currentVehicle = null;

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

    GTA.db.ready().then(async function () {
      var owned = await GTA.db.ownedVehicles.get(currentVehicleId);
      if (!owned) {
        GTA.Toast.warning('该载具尚未收藏，请先加入收藏');
        GTA.Router.navigate('vehicle/' + currentVehicleId);
        return;
      }
      render();
      // Back button
      var backBtn = document.getElementById('mod-back-btn');
      if (backBtn) {
        backBtn.onclick = function () {
          GTA.Router.navigate('vehicle/' + currentVehicleId);
        };
      }
    });
  }

  function destroy() {
    currentVehicleId = null;
    currentVehicle = null;
  }

  function render() {
    var container = document.getElementById('mod-content');
    if (!container || !currentVehicle) return;

    var v = currentVehicle;
    var hasCatMods = v.modifications && Object.keys(v.modifications).length > 0;

    container.innerHTML =
      '<div class="vehicle-breadcrumb">' +
        (Catalog.isDiscontinued(v.name) ? '<span class="badge badge-discontinued">绝版</span>' : '') +
        '<h2>' + Utils.escapeHtml(v.name) + '</h2>' +
      '</div>' +

      // --- Catalog modifications (tabs) — top priority ---
      (hasCatMods ? renderCatalogMods(v) : '<div class="glass-card" style="margin-top:0;padding:var(--space-md);text-align:center;color:var(--color-text-muted);">该车辆暂无改装选项数据</div>') +

      // --- Cosmetic form (collapsed) ---
      '<div class="mod-form glass-card" style="margin-top:0;">' +
        '<details>' +
          '<summary style="cursor:pointer;font-weight:var(--font-weight-semibold);color:var(--color-text-primary);padding:2px 0;font-size:var(--font-size-sm);">外观记录（颜色/涂装）</summary>' +
          '<div style="margin-top:var(--space-sm);">' +
            '<div class="mod-section">' +
              '<div class="mod-section-title">外观颜色</div>' +
              '<div class="form-row col-3">' +
                '<div class="form-group">' +
                  '<label class="form-label">主色</label>' +
                  '<div class="color-input-group">' +
                    '<input type="color" id="mod-primary-color" value="#ff0000">' +
                    '<input type="text" class="form-input" id="mod-primary-color-name" placeholder="红色">' +
                  '</div>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label class="form-label">副色</label>' +
                  '<div class="color-input-group">' +
                    '<input type="color" id="mod-secondary-color" value="#000000">' +
                    '<input type="text" class="form-input" id="mod-secondary-color-name" placeholder="黑色">' +
                  '</div>' +
                '</div>' +
                '<div class="form-group">' +
                  '<label class="form-label">涂装</label>' +
                  '<input type="text" class="form-input" id="mod-livery" placeholder="无">' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</details>' +
      '</div>' +

      // --- Extra cost + total + save ---
      '<div class="mod-form glass-card" style="margin-top:0;display:flex;gap:var(--space-sm);align-items:center;flex-wrap:wrap;">' +
        '<div class="form-group" style="margin:0;flex:1;min-width:140px;">' +
          '<label class="form-label" style="font-size:var(--font-size-xs);">额外花费</label>' +
          '<input type="number" class="form-input" id="mod-extra-cost" value="0" min="0" step="1000" style="text-align:right;">' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:var(--space-sm);">' +
          '<span style="font-size:var(--font-size-sm);color:var(--color-text-muted);">本次总花费:</span>' +
          '<span id="mod-current-total" style="font-size:var(--font-size-lg);font-weight:var(--font-weight-bold);color:var(--color-gold);font-family:var(--font-mono);">$0</span>' +
        '</div>' +
        '<button class="btn btn-primary mod-save-btn" id="btn-save-mod">保存改装记录</button>' +
      '</div>' +

      // --- History ---
      '<div class="mod-history" style="margin-top:var(--space-md);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm);">' +
          '<h3 style="margin:0;">改装历史</h3>' +
          '<span style="font-size:var(--font-size-sm);color:var(--color-text-muted);">累计: <strong id="mod-history-total" style="color:var(--color-success);">$0</strong></span>' +
        '</div>' +
        '<div id="mod-history-list"><p class="text-muted">暂无改装记录</p></div>' +
      '</div>';

    // Bind events
    document.getElementById('btn-save-mod').addEventListener('click', saveMod);
    document.getElementById('mod-extra-cost').addEventListener('input', updateTotal);
    if (hasCatMods) {
      container.querySelectorAll('.mod-radio').forEach(function (cb) {
        cb.addEventListener('change', updateTotal);
      });
      // Tab switching
      container.querySelectorAll('.mod-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
          var idx = this.getAttribute('data-tab');
          container.querySelectorAll('.mod-tab').forEach(function (t) { t.classList.remove('active'); });
          container.querySelectorAll('.mod-tab-panel').forEach(function (p) { p.classList.remove('active'); });
          this.classList.add('active');
          var panel = container.querySelector('.mod-tab-panel[data-tab="' + idx + '"]');
          if (panel) panel.classList.add('active');
        });
      });
    }

    updateTotal();
    loadModHistory();
  }

  function renderCatalogMods(v) {
    var categories = Object.keys(v.modifications);
    var html = '<div class="glass-card mod-tabs-card" style="margin-top:0;padding:0;">';

    // Tab bar
    html += '<div class="mod-tab-bar">';
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var items = v.modifications[cat];
      if (!items || items.length === 0) continue;
      html += '<button class="mod-tab' + (i === 0 ? ' active' : '') + '" data-tab="' + i + '">' +
        Utils.escapeHtml(cat) + '</button>';
    }
    html += '</div>';

    // Tab panels
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var items = v.modifications[cat];
      if (!items || items.length === 0) continue;

      html += '<div class="mod-tab-panel' + (i === 0 ? ' active' : '') + '" data-tab="' + i + '">';
      for (var j = 0; j < items.length; j++) {
        var m = items[j];
        var isStock = m.name === '无';
        var priceStr = m.price > 0 ? '$' + Number(m.price).toLocaleString('en-US') : '免费';

        html += '<label class="mod-option">' +
          '<input type="radio" class="mod-radio" name="mod-cat-' + i + '" data-category="' + Utils.escapeHtml(cat) + '" data-name="' + Utils.escapeHtml(m.name) + '" data-price="' + (m.price || 0) + '">' +
          '<span class="mod-option-name' + (isStock ? ' mod-option-stock' : '') + '">' + (isStock ? '原厂' : Utils.escapeHtml(m.name)) + '</span>' +
          '<span class="mod-option-price">' + priceStr + '</span>' +
        '</label>';
      }
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  function updateTotal() {
    var total = 0;
    document.querySelectorAll('.mod-radio:checked').forEach(function (cb) {
      total += parseInt(cb.getAttribute('data-price')) || 0;
    });
    var extra = parseInt((document.getElementById('mod-extra-cost') || {}).value) || 0;
    total += extra;

    var el = document.getElementById('mod-current-total');
    if (el) el.textContent = Utils.formatCurrency(total);
  }

  function getSelectedMods() {
    var selected = [];
    document.querySelectorAll('.mod-radio:checked').forEach(function (cb) {
      selected.push({
        category: cb.getAttribute('data-category'),
        name: cb.getAttribute('data-name'),
        price: parseInt(cb.getAttribute('data-price')) || 0
      });
    });
    return selected;
  }

  function getCosmeticData() {
    return {
      primaryColor: (document.getElementById('mod-primary-color') || {}).value || '#ff0000',
      primaryColorName: (document.getElementById('mod-primary-color-name') || {}).value || '',
      secondaryColor: (document.getElementById('mod-secondary-color') || {}).value || '#000000',
      secondaryColorName: (document.getElementById('mod-secondary-color-name') || {}).value || '',
      livery: (document.getElementById('mod-livery') || {}).value || ''
    };
  }

  async function saveMod() {
    var selectedMods = getSelectedMods();
    var cosmetic = getCosmeticData();
    var extraCost = parseInt((document.getElementById('mod-extra-cost') || {}).value) || 0;
    var modsCost = selectedMods.reduce(function (sum, m) { return sum + m.price; }, 0);
    var totalCost = modsCost + extraCost;

    var hasCosmetic = cosmetic.primaryColorName || cosmetic.livery;
    if (selectedMods.length === 0 && extraCost === 0 && !hasCosmetic) {
      GTA.Toast.warning('请至少选择一个改装选项、输入额外花费或填写外观信息');
      return;
    }

    try {
      await GTA.db.ready();
      await GTA.db.modifications.add({
        vehicleId: currentVehicleId,
        data: {
          primaryColor: cosmetic.primaryColor,
          primaryColorName: cosmetic.primaryColorName,
          secondaryColor: cosmetic.secondaryColor,
          secondaryColorName: cosmetic.secondaryColorName,
          livery: cosmetic.livery,
          selectedMods: selectedMods,
          modsCost: modsCost,
          extraCost: extraCost
        },
        cost: totalCost,
        createdAt: Date.now()
      });
      GTA.Toast.success('改装记录已保存！');
      GTA.EventBus.emit('mods:changed', { vehicleId: currentVehicleId });
      loadModHistory();
      // Reset selections
      document.querySelectorAll('.mod-radio').forEach(function (rb) { rb.checked = false; });
      var extraEl = document.getElementById('mod-extra-cost');
      if (extraEl) extraEl.value = '0';
      updateTotal();
    } catch (e) {
      console.error('[Mod] Save error:', e);
      GTA.Toast.error('保存失败');
    }
  }

  async function loadModHistory() {
    var historyList = document.getElementById('mod-history-list');
    var totalEl = document.getElementById('mod-history-total');
    if (!historyList) return;

    try {
      await GTA.db.ready();
      var records = await GTA.db.modifications
        .where('vehicleId').equals(currentVehicleId)
        .reverse()
        .sortBy('createdAt');

      var totalSpent = 0;
      records.forEach(function (r) { totalSpent += (r.cost || r.data?.cost || 0); });
      if (totalEl) totalEl.textContent = Utils.formatCurrency(totalSpent);

      if (records.length === 0) {
        historyList.innerHTML = '<p class="text-muted">暂无改装记录</p>';
        return;
      }

      var html = '';
      records.forEach(function (rec) {
        var data = rec.data || {};
        var cost = rec.cost || data.cost || 0;

        html += '<div class="mod-entry" style="border:1px solid var(--color-sidebar-border);border-radius:var(--radius-sm);padding:var(--space-sm);margin-bottom:var(--space-xs);background:var(--color-glass-bg);">';

        // Header
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-xs);">' +
          '<span style="font-size:var(--font-size-xs);color:var(--color-text-muted);">' + Utils.formatDateCN(rec.createdAt) + '</span>' +
          '<span style="display:flex;align-items:center;gap:var(--space-sm);">' +
            (cost > 0 ? '<span style="color:var(--color-gold);font-weight:var(--font-weight-bold);">+' + Utils.formatCurrency(cost) + '</span>' : '') +
            '<button class="mod-entry-delete" data-id="' + rec.id + '" style="background:none;border:1px solid #e74c3c;color:#e74c3c;border-radius:4px;cursor:pointer;font-size:var(--font-size-xs);padding:2px 8px;">删除</button>' +
          '</span></div>';

        // Show selected catalog mods
        if (data.selectedMods && data.selectedMods.length > 0) {
          html += '<div style="font-size:var(--font-size-xs);color:var(--color-text-secondary);margin-bottom:var(--space-xs);">';
          data.selectedMods.forEach(function (m) {
            html += '<div style="display:flex;justify-content:space-between;padding:2px 0;">' +
              '<span>' + Utils.escapeHtml(m.category) + ': ' + Utils.escapeHtml(m.name) + '</span>' +
              '<span style="color:var(--color-gold);">' + Utils.formatCurrency(m.price) + '</span>' +
            '</div>';
          });
          if (data.extraCost > 0) {
            html += '<div style="display:flex;justify-content:space-between;padding:2px 0;color:var(--color-text-muted);">' +
              '<span>额外花费</span><span>' + Utils.formatCurrency(data.extraCost) + '</span></div>';
          }
          html += '</div>';
        }

        // Show cosmetic info if present
        var hasCosmetic = data.primaryColorName || data.livery || data.wheelsName || data.plateText;
        if (hasCosmetic) {
          html += '<div style="display:flex;flex-wrap:wrap;gap:var(--space-xs);font-size:var(--font-size-xs);">';
          if (data.primaryColorName) {
            html += '<span style="display:inline-flex;align-items:center;gap:3px;"><span style="width:10px;height:10px;border-radius:50%;background:' + (data.primaryColor || '#fff') + ';display:inline-block;"></span>' + Utils.escapeHtml(data.primaryColorName) + '</span>';
          }
          if (data.livery) html += '<span class="badge">涂装: ' + Utils.escapeHtml(data.livery) + '</span>';
          if (data.wheelsName) html += '<span class="badge">' + Utils.escapeHtml(data.wheelsName) + '</span>';
          if (data.plateText) html += '<span class="badge">车牌: ' + Utils.escapeHtml(data.plateText) + '</span>';
          html += '</div>';
        }

        html += '</div>';
      });

      historyList.innerHTML = html;

      historyList.querySelectorAll('.mod-entry-delete').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var id = parseInt(this.getAttribute('data-id'));
          try {
            await GTA.db.modifications.delete(id);
            GTA.Toast.info('记录已删除');
            GTA.EventBus.emit('mods:changed', { vehicleId: currentVehicleId });
            loadModHistory();
          } catch (e) {
            GTA.Toast.error('删除失败');
          }
        });
      });

    } catch (e) {
      console.error('[Mod] History error:', e);
      historyList.innerHTML = '<p class="text-muted">加载失败</p>';
    }
  }

  return { init: init, destroy: destroy };
})();
