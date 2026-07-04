/* ===== Scanner Page — Two-Step Wizard ===== */
window.GTA = window.GTA || {};

GTA.Scanner = (function () {
  var Utils = GTA.Utils;
  var Catalog = GTA.VehicleCatalog;

  // Wizard state
  var wizardStep = 'garages';    // 'garages' | 'vehicles'
  var garages = [];              // [{name, id, vehicles:[], done:bool}]
  var currentGarageIdx = 0;
  var scanResults = [];          // current OCR results
  var scanning = false;

  function init() {
    GTA.log('[Scanner] Init');
    resetWizard();
    renderWizard();
  }

  function destroy() {}

  function resetWizard() {
    wizardStep = 'garages';
    garages = [];
    currentGarageIdx = 0;
    scanResults = [];
  }

  // ==================== WIZARD RENDER ====================

  function renderWizard() {
    var panel = document.getElementById('scan-panel-upload');
    if (!panel) return;

    if (wizardStep === 'garages') {
      renderStepGarages(panel);
    } else {
      renderStepVehicles(panel);
    }
  }

  // ---- STEP 1: Scan Garage List ----

  function renderStepGarages(panel) {
    panel.innerHTML =
      '<div class="wizard-steps">' +
        '<div class="wiz-step active"><span class="wiz-num">1</span>扫描车库列表</div>' +
        '<div class="wiz-step-arrow">→</div>' +
        '<div class="wiz-step"><span class="wiz-num">2</span>逐个扫描车辆</div>' +
      '</div>' +
      '<h3 style="margin-bottom:12px;">📸 请上传 GTA 车库列表截图</h3>' +
      '<div class="upload-zone glass-card" id="garage-list-zone">' +
        '<div class="upload-icon">🏢</div>' +
        '<div class="upload-text">拖入车库列表截图或点击选择</div>' +
        '<div class="upload-hint">截取游戏中车库选择界面</div>' +
        '<input type="file" id="garage-list-file" accept="image/*" hidden>' +
      '</div>' +
      '<div id="garage-progress" class="d-none" style="text-align:center;padding:24px;">' +
        '<div class="scan-progress-bar"><div class="scan-progress-fill" id="garage-progress-fill" style="width:0%"></div></div>' +
        '<p class="scan-progress-text" id="garage-progress-text">识别中...</p>' +
      '</div>' +
      '<div id="garage-results" class="d-none" style="margin-top:16px;"></div>';

    GTA.UploadZone.init('garage-list-zone', 'garage-list-file', handleGarageListFile);
  }

  async function handleGarageListFile(file) {
    var zone = document.getElementById('garage-list-zone');
    var prog = document.getElementById('garage-progress');
    var fill = document.getElementById('garage-progress-fill');
    var text = document.getElementById('garage-progress-text');
    if (zone) zone.classList.add('d-none');
    if (prog) prog.classList.remove('d-none');

    try {
      var lines = await GTA.OCR.recognize(file, function(pct) {
        if (fill) fill.style.width = pct + '%';
        if (text && pct > 80) text.textContent = '正在提取车库名称...';
      });

      // Extract garage names: filter out known vehicle names
      var allVehicles = Catalog.getAll();
      var vehicleNames = new Set(allVehicles.map(function(v) { return GTA.FuzzyMatch.normalize(v.name); }));

      var rawTexts = lines
        .map(function(l) { return l.text.trim(); })
        .filter(function(t) { return t.length > 1 && t.length < 60; });

      // Try to match against vehicles — unmatched are likely garage names
      var garageNames = [];
      rawTexts.forEach(function(t) {
        // CJK text = garage name, not vehicle — skip matching to avoid
        // digit-only normalize() remnants falsely matching vehicle names
        // (e.g. "日蚀，3号阁楼套房" → normalize="3" → matches "RT3000")
        if (/[一-鿿]/.test(t)) {
          if (!garageNames.find(function(g) { return g === t; })) {
            garageNames.push(t);
          }
          return;
        }
        var match = GTA.FuzzyMatch.findBestMatch(t, allVehicles);
        if (match.score < 0.5) {
          // Not a vehicle — probably a garage name
          if (!garageNames.find(function(g) { return g === t; })) {
            garageNames.push(t);
          }
        }
      });

      if (garageNames.length === 0 && rawTexts.length > 0) {
        // All matched vehicles — user might have uploaded vehicle screenshot by mistake
        // Still allow them to use the text as garage names
        garageNames = rawTexts.slice(0, 12);
      }

      // Show results
      if (prog) prog.classList.add('d-none');
      showGarageResults(garageNames);

    } catch(e) {
      console.error('[Scanner] Garage OCR error:', e, 'Stack:', e && e.stack);
      GTA.Toast.error('识别失败: ' + (e && (e.message || e.toString()) || '未知错误 - 请检查浏览器控制台(F12)'));
      if (zone) zone.classList.remove('d-none');
      if (prog) prog.classList.add('d-none');
    }
  }

  function showGarageResults(names) {
    var container = document.getElementById('garage-results');
    if (!container) return;
    container.classList.remove('d-none');

    if (names.length === 0) {
      container.innerHTML =
        '<div class="empty-state" style="padding:24px;"><p>未识别到车库名称</p>' +
        '<button class="btn btn-secondary btn-sm mt-md" id="btn-retry-garages">🔄 重新上传</button></div>';
      document.getElementById('btn-retry-garages').onclick = function() { renderWizard(); };
      return;
    }

    var html = '<h4 style="margin-bottom:12px;">识别到 ' + names.length + ' 个车库</h4>';
    html += '<div class="garage-name-list">';
    names.forEach(function(name, i) {
      html +=
        '<div class="garage-name-item">' +
          '<span class="garage-idx">' + (i + 1) + '</span>' +
          '<input type="text" class="form-input garage-name-input" value="' + Utils.escapeHtml(name) + '" data-idx="' + i + '" style="flex:1">' +
          '<button class="btn btn-sm btn-danger garage-del-btn" data-idx="' + i + '" style="padding:2px 8px;">✕</button>' +
        '</div>';
    });
    html += '</div>';
    html +=
      '<div style="margin-top:16px;display:flex;gap:8px;">' +
        '<button class="btn btn-primary" id="btn-confirm-garages" style="flex:1">✅ 确认并进入下一步</button>' +
        '<button class="btn btn-secondary" id="btn-retry-garages">🔄 重新上传</button>' +
      '</div>';

    container.innerHTML = html;

    // Bind delete buttons
    container.querySelectorAll('.garage-del-btn').forEach(function(btn) {
      btn.onclick = function() {
        this.closest('.garage-name-item').remove();
        updateGarageIndices();
      };
    });

    // Confirm button
    document.getElementById('btn-confirm-garages').onclick = function() {
      confirmGarages();
    };
    document.getElementById('btn-retry-garages').onclick = function() {
      renderWizard();
    };
  }

  function updateGarageIndices() {
    var items = document.querySelectorAll('.garage-name-item');
    items.forEach(function(item, i) {
      var span = item.querySelector('.garage-idx');
      var input = item.querySelector('.garage-name-input');
      var btn = item.querySelector('.garage-del-btn');
      if (span) span.textContent = i + 1;
      if (input) input.setAttribute('data-idx', i);
      if (btn) btn.setAttribute('data-idx', i);
    });
  }

  async function confirmGarages() {
    var inputs = document.querySelectorAll('.garage-name-input');
    var names = [];
    inputs.forEach(function(inp) {
      var name = inp.value.trim();
      if (name) names.push(name);
    });

    if (names.length === 0) {
      GTA.Toast.warning('至少需要一个车库');
      return;
    }

    // Create garages in DB
    await GTA.db.ready();
    var maxSort = 0;
    try {
      var existing = await GTA.db.garages.toArray();
      maxSort = existing.length > 0 ? Math.max.apply(null, existing.map(function(g) { return g.sortOrder || 0; })) : -1;
    } catch(e) {}

    garages = [];
    for (var i = 0; i < names.length; i++) {
      var gid = await GTA.db.garages.add({
        name: names[i],
        sortOrder: maxSort + 1 + i,
        createdAt: Date.now()
      });
      garages.push({ id: gid, name: names[i], vehicles: [], done: false });
    }

    GTA.Toast.success('已创建 ' + garages.length + ' 个车库');
    GTA.EventBus.emit('garage:changed', {});

    // Move to step 2
    wizardStep = 'vehicles';
    currentGarageIdx = 0;
    renderWizard();
  }

  // ---- STEP 2: Scan Vehicles per Garage ----

  function renderStepVehicles(panel) {
    // Build progress dots
    var progressHtml = '<div class="garage-progress-bar">';
    garages.forEach(function(g, i) {
      var cls = 'progress-dot';
      if (i === currentGarageIdx) cls += ' current';
      else if (g.done) cls += ' done';
      progressHtml += '<span class="' + cls + '" title="' + Utils.escapeHtml(g.name) + '">' + (i + 1) + '</span>';
      if (i < garages.length - 1) progressHtml += '<span class="progress-line"></span>';
    });
    progressHtml += '</div>';

    panel.innerHTML =
      '<div class="wizard-steps">' +
        '<div class="wiz-step done"><span class="wiz-num">✓</span>扫描车库列表</div>' +
        '<div class="wiz-step-arrow">→</div>' +
        '<div class="wiz-step active"><span class="wiz-num">2</span>逐个扫描车辆</div>' +
      '</div>' +
      progressHtml +
      '<div style="text-align:center;margin-bottom:16px;">' +
        '<h3>🏠 ' + Utils.escapeHtml(garages[currentGarageIdx].name) + '</h3>' +
        '<p class="text-sm text-muted">车库 ' + (currentGarageIdx + 1) + ' / ' + garages.length + '</p>' +
      '</div>' +
      '<div class="upload-zone glass-card" id="vehicle-upload-zone">' +
        '<div class="upload-icon">🏎️</div>' +
        '<div class="upload-text">请上传此车库的车辆截图</div>' +
        '<div class="upload-hint">截取车库内车辆列表画面</div>' +
        '<input type="file" id="vehicle-upload-file" accept="image/*" hidden>' +
      '</div>' +
      '<div id="vehicle-progress" class="d-none" style="text-align:center;padding:24px;">' +
        '<div class="scan-progress-bar"><div class="scan-progress-fill" id="vehicle-progress-fill" style="width:0%"></div></div>' +
        '<p class="scan-progress-text" id="vehicle-progress-text">识别中...</p>' +
      '</div>' +
      '<div id="vehicle-results" class="d-none" style="margin-top:16px;"></div>';

    GTA.UploadZone.init('vehicle-upload-zone', 'vehicle-upload-file', handleVehicleFile);
  }

  async function handleVehicleFile(file) {
    var zone = document.getElementById('vehicle-upload-zone');
    var prog = document.getElementById('vehicle-progress');
    var fill = document.getElementById('vehicle-progress-fill');
    var text = document.getElementById('vehicle-progress-text');
    if (zone) zone.classList.add('d-none');
    if (prog) prog.classList.remove('d-none');
    if (fill) fill.style.width = '0%';

    try {
      var lines = await GTA.OCR.recognize(file, function(pct) {
        if (fill) fill.style.width = pct + '%';
        if (text) {
          if (pct < 50) text.textContent = 'OCR 初始化...';
          else if (pct < 90) text.textContent = '识别文字中...';
          else text.textContent = '匹配车辆...';
        }
      });

      var vehicles = Catalog.getAll();
      var seenOcr = {};
      scanResults = [];
      lines.forEach(function(line) {
        if (!line.text) return;
        var t = line.text.trim();
        if (t.length < 2 || t.length > 80 || seenOcr[t]) return;
        seenOcr[t] = true;
        var match = GTA.FuzzyMatch.findBestMatch(t, vehicles);
        scanResults.push({
          ocrText: t,
          confidence: line.confidence || 0,
          match: match.vehicle,
          matchName: match.vehicle ? match.vehicle.name : null,
          matchScore: match.score,
          matchMethod: match.method,
          status: match.method === 'exact' || match.method === 'contains' || match.method === 'fuzzy' ? 'matched' :
                  match.method === 'possible' ? 'possible' : 'no-match'
        });
      });

      if (prog) prog.classList.add('d-none');
      showVehicleResults();

    } catch(e) {
      console.error('[Scanner] Vehicle OCR error:', e);
      GTA.Toast.error('识别失败: ' + e.message);
      if (zone) zone.classList.remove('d-none');
      if (prog) prog.classList.add('d-none');
    }
  }

  function showVehicleResults() {
    var container = document.getElementById('vehicle-results');
    if (!container) return;
    container.classList.remove('d-none');

    if (scanResults.length === 0) {
      container.innerHTML =
        '<div class="empty-state" style="padding:16px;"><p>未识别到车辆</p></div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button class="btn btn-secondary" id="btn-retry-vehicle" style="flex:1">🔄 重新上传</button>' +
          '<button class="btn btn-primary" id="btn-skip-garage" style="flex:1">跳过此车库 →</button>' +
        '</div>' +
        '<p class="text-sm text-muted" style="margin-top:12px;">⚠️ OCR 识别可能不准确，请确保截图清晰、文字可见。</p>';
    } else {
      var html = '<h4 style="margin-bottom:12px;">识别到 ' + scanResults.length + ' 辆</h4>';
      html += '<div id="vehicle-result-list">';
      scanResults.forEach(function(r, i) {
        var icon = r.status === 'matched' ? '✅' : (r.status === 'possible' ? '⚠️' : '❌');
        var cls = r.status;
        html +=
          '<div class="result-item ' + cls + '">' +
            '<div class="result-index">' + (i + 1) + '</div>' +
            '<div class="result-content">' +
              '<input type="text" class="form-input ocr-edit-input" value="' + Utils.escapeHtml(r.ocrText) + '" data-idx="' + i + '" style="width:100%;margin-bottom:4px;">' +
              '<div class="result-match-name ' + cls + '" id="match-label-' + i + '">' + icon + ' ' + (r.matchName || '未匹配') +
                (r.matchScore ? ' (' + Math.round(r.matchScore * 100) + '%)' : '') + '</div>' +
              (r.status === 'no-match' || r.status === 'possible'
                ? '<select class="form-select manual-match-select" data-idx="' + i + '" style="margin-top:4px;"><option value="">手动选择...</option>' +
                  Catalog.getAll().map(function(v) { return '<option value="' + v.id + '">' + Utils.escapeHtml(v.name) + '</option>'; }).join('') + '</select>'
                : '') +
            '</div>' +
            '<div class="result-confidence">' + Math.round(r.confidence) + '%</div>' +
            '<div class="result-actions">' +
              (r.status === 'matched' || r.status === 'possible'
                ? '<button class="btn btn-success btn-sm btn-add-one" data-idx="' + i + '">添加</button>'
                : '<button class="btn btn-secondary btn-sm btn-add-manual" data-idx="' + i + '">添加</button>') +
            '</div>' +
          '</div>';
      });
      html += '</div>';
      html +=
        '<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;">' +
          '<button class="btn btn-primary" id="btn-confirm-vehicles" style="flex:1">✅ 全部入库</button>' +
          '<button class="btn btn-success" id="btn-add-all-matched" style="flex:1">📥 一键添加已匹配</button>' +
          '<button class="btn btn-secondary" id="btn-retry-vehicle">🔄 重新上传</button>' +
          '<button class="btn btn-secondary" id="btn-prev-garage">⬅ 上一个车库</button>' +
          '<button class="btn btn-secondary" id="btn-skip-garage" style="flex:1">跳过 →</button>' +
        '</div>' +
        '<p class="text-sm text-muted" style="margin-top:12px;">⚠️ OCR 识别可能不准确，请手动校准文字后再确认添加。</p>';
      container.innerHTML = html;

      // Bind add buttons
      container.querySelectorAll('.btn-add-one').forEach(function(btn) {
        btn.onclick = function() {
          var i = parseInt(this.getAttribute('data-idx'));
          var r = scanResults[i];
          if (r && r.match) { r._added = true; this.textContent = '✓'; this.disabled = true; this.classList.remove('btn-success'); this.classList.add('btn-secondary'); }
        };
      });
      container.querySelectorAll('.btn-add-manual').forEach(function(btn) {
        btn.onclick = function() {
          var i = parseInt(this.getAttribute('data-idx'));
          var r = scanResults[i];
          var sel = container.querySelectorAll('.manual-match-select')[i];
          if (sel && sel.value) {
            var v = Catalog.getById(sel.value);
            if (v) { r.match = v; r.matchName = v.name; r.status = 'matched'; r._added = true; this.textContent = '✓'; this.disabled = true; }
          } else { GTA.Toast.warning('请先选择车辆'); }
        };
      });
      container.querySelectorAll('.manual-match-select').forEach(function(sel, i) {
        sel.onchange = function() {
          if (this.value) { var v = Catalog.getById(this.value);
            if (v) { scanResults[i].match = v; scanResults[i].matchName = v.name; scanResults[i].status = 'matched'; }
          }
        };
      });
      // OCR text edit → re-match against catalog
      container.querySelectorAll('.ocr-edit-input').forEach(function(inp) {
        inp.oninput = function() {
          var i = parseInt(this.getAttribute('data-idx'));
          var newText = this.value.trim();
          var r = scanResults[i];
          if (!r || !newText) return;
          r.ocrText = newText;
          var match = GTA.FuzzyMatch.findBestMatch(newText, Catalog.getAll());
          r.match = match.vehicle;
          r.matchName = match.vehicle ? match.vehicle.name : null;
          r.matchScore = match.score;
          r.matchMethod = match.method;
          r.status = match.method === 'exact' || match.method === 'contains' || match.method === 'fuzzy' ? 'matched' :
                      match.method === 'possible' ? 'possible' : 'no-match';
          var icon = r.status === 'matched' ? '✅' : (r.status === 'possible' ? '⚠️' : '❌');
          var label = document.getElementById('match-label-' + i);
          if (label) {
            label.textContent = icon + ' ' + (r.matchName || '未匹配') + (r.matchScore ? ' (' + Math.round(r.matchScore * 100) + '%)' : '');
            label.className = 'result-match-name ' + r.status;
          }
          // Show/hide manual select
          var sel = document.querySelector('.manual-match-select[data-idx="' + i + '"]');
          if (sel) sel.style.display = (r.status === 'no-match' || r.status === 'possible') ? '' : 'none';
        };
      });
    }

    document.getElementById('btn-confirm-vehicles').onclick = confirmVehicles;
    document.getElementById('btn-retry-vehicle').onclick = function() { renderWizard(); };
    document.getElementById('btn-prev-garage').onclick = prevGarage;
    document.getElementById('btn-add-all-matched').onclick = function() {
      var count = 0;
      scanResults.forEach(function(r, i) {
        if ((r.status === 'matched' || r.status === 'possible') && r.match && !r._added) {
          r._added = true; count++;
          var btn = document.querySelector('.btn-add-one[data-idx="' + i + '"]');
          if (btn) { btn.textContent = '✓'; btn.disabled = true; btn.classList.remove('btn-success'); btn.classList.add('btn-secondary'); }
        }
      });
      GTA.Toast.success('已标记 ' + count + ' 辆，点击"全部入库"保存');
    };
    document.getElementById('btn-skip-garage').onclick = skipGarage;
    if (document.getElementById('btn-retry-vehicle')) {
      document.getElementById('btn-retry-vehicle').onclick = function() { renderWizard(); };
    }
  }

  async function confirmVehicles() {
    var toAdd = scanResults.filter(function(r) { return (r.status === 'matched' || r.status === 'possible' || r._added) && r.match; });
    if (toAdd.length === 0) {
      GTA.Toast.warning('没有可入库的车辆');
      return;
    }

    var garage = garages[currentGarageIdx];
    await GTA.db.ready();
    var added = 0, skipped = 0;

    for (var i = 0; i < toAdd.length; i++) {
      var r = toAdd[i];
      try {
        // Add to owned collection
        var ex = await GTA.db.ownedVehicles.get(r.match.id);
        if (!ex) {
          await GTA.db.ownedVehicles.put({ vehicleId: r.match.id, addedAt: Date.now() });
          GTA.EventBus.emit('vehicle:added', { vehicleId: r.match.id });
          added++;
        } else { skipped++; }

        // Add to garage
        var inGarage = await GTA.db.garageVehicles
          .where({ garageId: garage.id, vehicleId: r.match.id }).count();
        if (inGarage === 0) {
          var maxSort = 0;
          var records = await GTA.db.garageVehicles.where('garageId').equals(garage.id).toArray();
          if (records.length > 0) maxSort = Math.max.apply(null, records.map(function(x) { return x.sortOrder || 0; })) + 1;
          await GTA.db.garageVehicles.add({ garageId: garage.id, vehicleId: r.match.id, sortOrder: maxSort });
        }
      } catch(e) {}
    }

    garage.done = true;
    GTA.Toast.success(garage.name + '：新增 ' + added + ' 辆' + (skipped > 0 ? '，已存在 ' + skipped + ' 辆' : ''));
    GTA.EventBus.emit('garage:changed', { garageId: garage.id });

    nextGarage();
  }

  function skipGarage() {
    garages[currentGarageIdx].done = true;
    nextGarage();
  }

  function prevGarage() {
    if (currentGarageIdx > 0) {
      currentGarageIdx--;
    }
    renderWizard();
  }

  function nextGarage() {
    currentGarageIdx++;
    if (currentGarageIdx >= garages.length) {
      var done = garages.filter(function(g) { return g.done; }).length;
      GTA.Toast.success('全部完成！共处理 ' + done + ' 个车库');
      // Reset back to step 1
      resetWizard();
    }
    renderWizard();
  }

  return { init: init, destroy: destroy };
})();
