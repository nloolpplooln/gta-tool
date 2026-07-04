/* ===== DLC Timeline Page ===== */
window.GTA = window.GTA || {};

GTA.DlcTimeline = (function () {
  var Utils = GTA.Utils;
  var Catalog = GTA.VehicleCatalog;

  function init() {
    render();
  }

  function destroy() {}

  function buildTimeline() {
    var all = Catalog.getAll();
    var dlcMap = {};

    all.forEach(function (v) {
      var dlc = v.dlc || '原版(GTA5)';
      if (!dlcMap[dlc]) {
        dlcMap[dlc] = {
          name: dlc,
          date: v.release ? v.release.date : null,
          vehicles: [],
          totalValue: 0,
          brands: new Set(),
          classes: new Set()
        };
      }
      dlcMap[dlc].vehicles.push(v);
      dlcMap[dlc].totalValue += v.price_buy || 0;
      if (v.brand) dlcMap[dlc].brands.add(v.brand);
      if (v.type) dlcMap[dlc].classes.add(v.type);
      // Use earliest date
      if (v.release && v.release.date) {
        if (!dlcMap[dlc].date || v.release.date < dlcMap[dlc].date) {
          dlcMap[dlc].date = v.release.date;
        }
      }
    });

    // Convert to array and sort by date
    var dlcs = Object.values(dlcMap);
    dlcs.sort(function (a, b) {
      return (a.date || '9999').localeCompare(b.date || '9999');
    });

    // Put "原版(GTA5)" and "GTA5" first
    dlcs.sort(function (a, b) {
      if (a.name.indexOf('原版') !== -1 || a.name === 'GTA5') return -1;
      if (b.name.indexOf('原版') !== -1 || b.name === 'GTA5') return 1;
      return 0;
    });

    // Re-sort preserving base game first, then by date
    dlcs.sort(function (a, b) {
      var aBase = a.name.indexOf('原版') !== -1 || a.name === 'GTA5';
      var bBase = b.name.indexOf('原版') !== -1 || b.name === 'GTA5';
      if (aBase && !bBase) return -1;
      if (!aBase && bBase) return 1;
      if (aBase && bBase) return 0;
      return (a.date || '9999').localeCompare(b.date || '9999');
    });

    return dlcs;
  }

  function render() {
    var container = document.getElementById('dlc-timeline-content');
    if (!container) return;

    var dlcs = buildTimeline();
    var totalVehicles = 0;
    var totalValue = 0;
    dlcs.forEach(function (d) { totalVehicles += d.vehicles.length; totalValue += d.totalValue; });

    var html = '';

    // ── Header stats ──
    html += '<div class="timeline-header" style="text-align:center;margin-bottom:var(--space-lg);">';
    html += '<h2 style="margin:0 0 var(--space-xs);">GTA Online DLC 时间线</h2>';
    html += '<p style="color:var(--color-text-muted);font-size:var(--font-size-sm);margin:0;">' +
      dlcs.length + ' 个DLC · ' + totalVehicles + ' 辆车 · 总价值 ' + Utils.formatCurrency(totalValue) +
    '</p></div>';

    // ── Timeline tree ──
    html += '<div class="timeline-tree" style="position:relative;padding-left:40px;">';

    // Vertical line
    html += '<div style="position:absolute;left:18px;top:0;bottom:0;width:2px;background:var(--color-gold);opacity:0.3;"></div>';

    for (var i = 0; i < dlcs.length; i++) {
      var dlc = dlcs[i];
      var isBase = i === 0;
      var year = dlc.date ? dlc.date.substring(0, 4) : '?';
      var dateDisplay = dlc.date || '未知';

      // Node dot
      var dotSize = isBase ? 16 : 10;
      var dotColor = isBase ? 'var(--color-gold)' :
                     dlc.vehicles.length >= 30 ? '#e74c3c' :
                     dlc.vehicles.length >= 15 ? '#f39c12' : '#3498db';

      html += '<div class="timeline-node" style="position:relative;margin-bottom:' + (isBase ? 'var(--space-lg)' : 'var(--space-md)') + ';">';

      // Dot
      html += '<div style="position:absolute;left:-40px;top:8px;width:' + dotSize + 'px;height:' + dotSize + 'px;background:' + dotColor + ';border:2px solid var(--color-bg-primary);border-radius:50%;z-index:2;' + (isBase ? 'box-shadow:0 0 12px ' + dotColor + ';' : '') + '"></div>';

      // Branch connector line
      html += '<div style="position:absolute;left:' + (-40 + dotSize/2) + 'px;top:' + (8 + dotSize/2) + 'px;width:20px;height:2px;background:' + dotColor + ';opacity:0.5;"></div>';

      // Card
      html += '<div class="dlc-card" style="background:var(--color-glass-bg);border:1px solid var(--color-sidebar-border);border-radius:var(--radius-md);overflow:hidden;' + (isBase ? 'border-left:3px solid var(--color-gold);' : '') + '">';

      // Card header
      html += '<div class="dlc-card-header" data-dlc-idx="' + i + '" style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-sm) var(--space-md);cursor:pointer;user-select:none;' + (isBase ? '' : '') + '">';
      html += '<div style="flex:1;min-width:0;">';
      html += '<div style="display:flex;align-items:center;gap:var(--space-sm);">';
      html += '<strong style="font-size:var(--font-size-sm);color:var(--color-text-primary);">' + Utils.escapeHtml(dlc.name) + '</strong>';
      html += '<span style="font-size:10px;color:var(--color-text-muted);">' + dateDisplay + '</span>';
      html += '</div>';
      html += '<div style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:2px;">' +
        dlc.vehicles.length + ' 辆车 · ' + Utils.formatCurrency(dlc.totalValue) +
        (dlc.brands.size > 0 ? ' · ' + dlc.brands.size + ' 品牌' : '') +
      '</div></div>';
      html += '<span class="dlc-arrow" style="font-size:12px;color:var(--color-text-muted);transition:transform 0.2s;">▶</span></div>';

      // Vehicle list (collapsible)
      html += '<div class="dlc-vehicles" id="dlc-vehicles-' + i + '" style="display:none;padding:0 var(--space-md) var(--space-md);">';
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:var(--space-xs);">';

      // Sort vehicles by price
      var vehicles = dlc.vehicles.slice().sort(function (a, b) { return (b.price_buy || 0) - (a.price_buy || 0); });

      vehicles.forEach(function (v) {
        html += '<div style="display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-xs) var(--space-sm);background:rgba(255,255,255,0.02);border-radius:var(--radius-sm);cursor:pointer;font-size:var(--font-size-xs);" onclick="GTA.Router.navigate(\'vehicle/' + v.id + '\')">';
        // Thumbnail
        html += '<div style="width:36px;height:20px;background:var(--color-bg-tertiary);border-radius:2px;overflow:hidden;flex-shrink:0;">';
        if (v.thumbnail) {
          html += '<img src="' + v.thumbnail + '" alt="" style="width:100%;height:100%;object-fit:cover;" loading="lazy" onerror="this.style.display=\'none\'">';
        }
        html += '</div>';
        html += '<span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--color-text-secondary);" title="' + Utils.escapeHtml(v.name) + '">' + Utils.escapeHtml(v.name) + '</span>';
        html += '<span style="color:var(--color-gold);font-weight:var(--font-weight-medium);flex-shrink:0;">' + Utils.formatCurrency(v.price_buy) + '</span>';
        html += '</div>';
      });

      html += '</div></div></div></div>';
    }

    html += '</div>'; // timeline-tree

    // ── Year markers ──
    html += '<div style="position:fixed;right:var(--space-md);top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:4px;z-index:10;">';
    var years = {};
    dlcs.forEach(function (d) {
      var y = d.date ? d.date.substring(0, 4) : '?';
      if (!years[y]) { years[y] = true; }
    });
    Object.keys(years).sort().forEach(function (y) {
      html += '<span style="font-size:10px;color:var(--color-text-muted);opacity:0.5;text-align:right;">' + y + '</span>';
    });
    html += '</div>';

    container.innerHTML = html;

    // Bind click handlers
    var headers = container.querySelectorAll('.dlc-card-header');
    headers.forEach(function (h) {
      h.addEventListener('click', function () {
        var idx = this.getAttribute('data-dlc-idx');
        var body = document.getElementById('dlc-vehicles-' + idx);
        var arrow = this.querySelector('.dlc-arrow');
        if (body) {
          var isHidden = body.style.display === 'none';
          body.style.display = isHidden ? 'block' : 'none';
          if (arrow) arrow.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
        }
      });
    });
  }

  return { init: init, destroy: destroy };
})();
