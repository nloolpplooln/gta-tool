/* ===== Vehicle Compare Page ===== */
window.GTA = window.GTA || {};

GTA.Compare = (function () {
  var Utils = GTA.Utils;
  var Catalog = GTA.VehicleCatalog;
  var MAX_COMPARE = 4;

  // ── Global compare list (sessionStorage) ──
  function getList() {
    try {
      return JSON.parse(sessionStorage.getItem('gta_compare_list') || '[]');
    } catch (e) { return []; }
  }
  function saveList(list) {
    sessionStorage.setItem('gta_compare_list', JSON.stringify(list));
  }
  function addToList(vehicleId) {
    var list = getList();
    if (list.indexOf(vehicleId) === -1 && list.length < MAX_COMPARE) {
      list.push(vehicleId);
      saveList(list);
      return true;
    }
    return false;
  }
  function removeFromList(vehicleId) {
    var list = getList().filter(function (id) { return id !== vehicleId; });
    saveList(list);
  }
  function clearList() {
    saveList([]);
  }

  // Export for use in other pages (vehicle detail, encyclopedia)
  window.GTA.CompareList = {
    get: getList, add: addToList, remove: removeFromList, clear: clearList, max: MAX_COMPARE
  };

  function init() {
    render();
  }

  function destroy() {}

  function render() {
    var container = document.getElementById('compare-content');
    if (!container) return;

    var list = getList();
    var vehicles = list.map(function (id) { return Catalog.getById(id); }).filter(Boolean);

    if (vehicles.length === 0) {
      container.innerHTML =
        '<div class="compare-empty" style="text-align:center;padding:var(--space-xl);">' +
          '<p style="color:var(--color-text-muted);font-size:var(--font-size-lg);">尚未选择对比载具</p>' +
          '<p style="color:var(--color-text-muted);">在载具百科中点击 "对比" 按钮添加载具</p>' +
          '<a href="#/encyclopedia" style="color:var(--color-gold);">前往载具百科</a>' +
        '</div>';
      return;
    }

    var numCols = vehicles.length;
    var colWidth = numCols === 1 ? '100%' : numCols === 2 ? '50%' : numCols === 3 ? '33.33%' : '25%';

    var html = '<div style="display:flex;gap:var(--space-sm);overflow-x:auto;padding-bottom:var(--space-md);">';

    // ── Headers (vehicle names + images) ──
    for (var i = 0; i < vehicles.length; i++) {
      var v = vehicles[i];
      html += '<div style="flex:' + (numCols === 1 ? '1' : '0 0 ' + colWidth) + ';min-width:220px;">';
      // Image
      html += '<div style="background:var(--color-bg-tertiary);border-radius:var(--radius-md);overflow:hidden;margin-bottom:var(--space-sm);aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;position:relative;">';
      if (v.thumbnail) {
        html += '<img src="' + v.thumbnail + '" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'">';
      } else if (v.model_name) {
        html += '<img src="https://cdn-gta-images.antwen.cn/images/' + v.model_name.toLowerCase() + '/main.jpg" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'">';
      }
      html += '<button class="compare-remove-btn" data-id="' + v.id + '" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.7);color:#e74c3c;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:14px;line-height:1;">✕</button>';
      html += '</div>';
      // Name
      html += '<h3 style="margin:0 0 var(--space-xs);font-size:var(--font-size-sm);text-align:center;">' + Utils.escapeHtml(v.name) + '</h3>';
      html += '<div style="text-align:center;margin-bottom:var(--space-sm);font-size:var(--font-size-xs);color:var(--color-text-muted);">' +
        Utils.escapeHtml(v.brand) + ' · ' + Utils.escapeHtml(v.type) + '</div>';
      html += '</div>';
    }
    html += '</div>';

    // ── Comparison rows ──
    html += '<div class="compare-table" style="overflow-x:auto;">';

    html += renderRow('售价', vehicles, function (v) { return Utils.formatCurrency(v.price_buy); });
    html += renderRow('批发价', vehicles, function (v) { return v._detail && v._detail.price_wholesale ? Utils.formatCurrency(v._detail.price_wholesale) : '-'; });
    html += renderRow('载具类型', vehicles, function (v) { return Utils.escapeHtml(v.type); });
    html += renderRow('品牌', vehicles, function (v) { return Utils.escapeHtml(v.brand); });
    html += renderRow('DLC', vehicles, function (v) { return v.dlc || '原版'; });
    html += renderRow('座位数', vehicles, function (v) { return v.seats || '-'; });

    // Performance
    html += renderRow('速度', vehicles, function (v) { return v.performance ? v.performance.speed : '-'; }, true);
    html += renderRow('加速', vehicles, function (v) { return v.performance ? v.performance.acceleration : '-'; }, true);
    html += renderRow('刹车', vehicles, function (v) { return v.performance ? v.performance.braking : '-'; }, true);
    html += renderRow('操控', vehicles, function (v) { return v.performance ? v.performance.handling : '-'; }, true);
    html += renderRow('抓地', vehicles, function (v) { return v.performance ? v.performance.traction : '-'; }, true);

    // Specs
    if (v.specs) {
      html += renderRow('档位', vehicles, function (v) { return v.specs ? v.specs.gears : '-'; });
      html += renderRow('重量(kg)', vehicles, function (v) { return v.specs ? v.specs.weight : '-'; });
      html += renderRow('驱动', vehicles, function (v) { return v.specs ? v.specs.drive : '-'; });
      html += renderRow('布局', vehicles, function (v) { return v.specs ? v.specs.layout : '-'; });
      html += renderRow('极速(实测)', vehicles, function (v) { return v.specs ? v.specs.top_speed_raw : '-'; });
      if (v.specs.lap_time) {
        html += renderRow('圈速', vehicles, function (v) { return v.specs ? v.specs.lap_time : '-'; });
      }
    }

    // Armor
    html += renderRow('装甲', vehicles, function (v) { return v.armor ? v.armor.name : '无'; });
    html += renderRow('导弹干扰', vehicles, function (v) { return v.missile_protection ? '有' : '无'; });

    // Explosion resistance
    var erLabels = ['RPG/导弹', '黏弹/手雷', '爆炸弹', '坦克炮', '防空炮'];
    erLabels.forEach(function (label, idx) {
      var key = 'er' + (idx + 1);
      html += renderRow(label, vehicles, function (v) {
        if (!v.explosion_resistance) return '-';
        var val = v.explosion_resistance[key];
        return val ? val + '发' : '-';
      });
    });

    // Tags
    html += renderRow('特性标签', vehicles, function (v) {
      if (!v.tags) return '-';
      var tags = Object.keys(v.tags).filter(function (k) { return v.tags[k]; });
      var skip = { id: true, created_at: true, updated_at: true, model_name: true, vehicle_id: true, liveries: true };
      tags = tags.filter(function (t) { return !skip[t]; });
      if (tags.length === 0) return '-';
      return tags.slice(0, 6).map(function (t) {
        return '<span class="badge" style="font-size:10px;">' + (t.replace(/_/g, ' ')) + '</span>';
      }).join(' ');
    });

    // Based on
    html += renderRow('真实车型', vehicles, function (v) { return v.based_on || '-'; });

    html += '</div>';

    // Clear button
    html += '<div style="text-align:center;margin-top:var(--space-lg);">' +
      '<button class="btn btn-secondary" id="btn-clear-compare">清空对比列表</button>' +
    '</div>';

    container.innerHTML = html;

    // Bind remove buttons
    container.querySelectorAll('.compare-remove-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        removeFromList(this.getAttribute('data-id'));
        render();
        GTA.Toast.info('已移除');
      });
    });

    // Bind clear button
    var clearBtn = document.getElementById('btn-clear-compare');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearList();
        render();
        GTA.Toast.info('已清空');
      });
    }
  }

  function renderRow(label, vehicles, valueFn, isPercent) {
    var numCols = vehicles.length;
    var html = '<div style="display:flex;align-items:center;border-bottom:1px solid var(--color-sidebar-border);padding:var(--space-xs) 0;gap:var(--space-sm);">';
    html += '<div style="flex:0 0 100px;font-size:var(--font-size-xs);color:var(--color-text-muted);">' + label + '</div>';
    for (var i = 0; i < vehicles.length; i++) {
      var value = valueFn(vehicles[i]);
      var colWidth = numCols === 1 ? '1' : '0 0 calc(' + (100 / numCols) + '% - ' + (100 / numCols) + 'px)';
      html += '<div style="flex:1;font-size:var(--font-size-xs);color:var(--color-text-primary);font-weight:var(--font-weight-medium);text-align:center;">' + value + '</div>';
    }
    html += '</div>';
    return html;
  }

  return { init: init, destroy: destroy };
})();
