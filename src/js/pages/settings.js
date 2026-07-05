/* ===== About / Settings Page ===== */
window.GTA = window.GTA || {};

GTA.Settings = (function () {
  var Utils = GTA.Utils;
  var Catalog = GTA.VehicleCatalog;

  async function init() {
    var container = document.getElementById('settings-content');
    if (!container) return;

    container.innerHTML =
      '<div class="settings-grid">' +
        renderBrandHero() +
        renderPlayerName() +
        renderAutoUpdate() +
        renderCloudSync() +
        renderDataActions() +
        renderDisclaimer() +
      '</div>';

    loadPlayerName();
    loadDisplayName();
    bindButtons();
  }

  function renderPlayerName() {
    return '<div class="settings-card">' +
      '<h3>玩家昵称</h3>' +
      '<p>设置你的游戏内玩家名称，将显示在分享卡片上。</p>' +
      '<div class="settings-row">' +
        '<input type="text" class="form-input" id="settings-player-name" placeholder="输入玩家名称" maxlength="30">' +
        '<button class="btn btn-primary" id="btn-save-name">保存</button>' +
      '</div>' +
      '<p class="text-muted" style="margin-top:var(--space-xs)" id="settings-name-status"></p>' +
    '</div>' +
    '<div class="settings-card">' +
      '<h3>显示名称（账号）</h3>' +
      '<p>修改你的账号显示名称，会显示在侧边栏。需要登录后使用。</p>' +
      '<div class="settings-row">' +
        '<input type="text" class="form-input" id="settings-display-name" placeholder="输入显示名称" maxlength="30">' +
        '<button class="btn btn-primary" id="btn-save-display-name">保存</button>' +
      '</div>' +
      '<p class="text-muted" style="margin-top:var(--space-xs)" id="settings-display-name-status"></p>' +
    '</div>';
  }

  function renderAutoUpdate() {
    return '<div class="settings-card">' +
      '<h3>软件更新</h3>' +
      '<p>当前版本：<span id="update-current-version">v' + (GTA.APP_VERSION || '未知') + '</span></p>' +
      '<div class="settings-row">' +
        '<button class="btn btn-primary" id="btn-check-update">检查更新</button>' +
        '<button class="btn btn-success" id="btn-install-update" style="display:none">重启安装更新</button>' +
      '</div>' +
      '<p class="text-muted" style="margin-top:var(--space-sm)" id="update-status"></p>' +
    '</div>';
  }

  function renderCloudSync() {
    return '<div class="settings-card">' +
      '<h3>云端同步</h3>' +
      '<p style="color:var(--color-text-muted);margin-bottom:var(--space-md)" id="cloud-status">请先登录后使用云端功能</p>' +
      '<div class="settings-row">' +
        '<button class="btn btn-primary" id="btn-cloud-upload">上传到云端</button>' +
        '<button class="btn btn-secondary" id="btn-cloud-download">从云端下载</button>' +
      '</div>' +
      '<p class="text-muted" style="margin-top:var(--space-sm)">上传将推送本地数据到云端，下载将云端数据合并到本地。</p>' +
    '</div>';
  }

  function renderDataActions() {
    return '<div class="settings-card">' +
      '<h3>数据管理</h3>' +
      '<div class="settings-actions">' +
        '<div class="settings-action-item">' +
          '<div><strong>导出 JSON 备份</strong><p>收藏、车库、改装记录全部导出为 JSON，可用于数据迁移</p></div>' +
          '<button class="btn btn-secondary" id="btn-export-json">JSON</button>' +
        '</div>' +
        '<div class="settings-action-item">' +
          '<div><strong>导出 CSV</strong><p>导出收藏车辆列表为 Excel/CSV，含名称、品牌、价格、购买时间</p></div>' +
          '<button class="btn btn-secondary" id="btn-export-csv">CSV</button>' +
        '</div>' +
        '<div class="settings-action-item">' +
          '<div><strong>导入备份</strong><p>从 JSON 备份文件恢复全部数据（会覆盖现有数据）</p></div>' +
          '<button class="btn btn-secondary" id="btn-import-data">导入</button>' +
          '<input type="file" id="import-file-input" accept=".json" style="display:none">' +
        '</div>' +
        '<div class="settings-action-item" style="border-top:1px solid var(--color-danger);padding-top:var(--space-md)">' +
          '<div><strong style="color:var(--color-danger)">清除所有数据</strong><p>删除全部收藏、车库、改装记录和照片，不可恢复</p></div>' +
          '<button class="btn btn-danger" id="btn-clear-data">清除</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderBrandHero() {
    var vehicleCount = Catalog ? Catalog.getCount() : 858;
    return '<div class="settings-brand">' +
      '<img class="settings-logo" src="../../assets/icons/app-icon.png" alt="VaultGTA" onerror="this.style.display=\'none\'">' +
      '<h2 class="settings-brand-name">VaultGTA</h2>' +
      '<p class="settings-slogan">GTA Online 载具收藏管理工具</p>' +
      '<p class="settings-meta">收录 <strong>' + vehicleCount + '</strong> 款载具 &nbsp;·&nbsp; 版本 <span id="about-version">v' + (GTA.APP_VERSION || '10.27.0') + '</span></p>' +
      '<p class="settings-meta">数据来源 antwen.cn / xiaoheihe.cn</p>' +
      '<p class="settings-author">by oolpploo &nbsp;·&nbsp; <a href="https://github.com/oolpploo/VaultGTA" target="_blank">GitHub</a> &nbsp;·&nbsp; 2453133436@qq.com</p>' +
    '</div>';
  }

  function renderAboutInfo() {
    var vehicleCount = Catalog ? Catalog.getCount() : 858;
    return '<div class="settings-card">' +
      '<h3>关于 VaultGTA</h3>' +
      '<p>GTA Online 载具收藏管理工具，收录 <strong>' + vehicleCount + '</strong> 款载具的完整数据。</p>' +
      '<p>数据来源：antwen.cn（中文GTA数据库）、小黑盒 GTA5 百科 (xiaoheihe.cn)</p>' +
      '<p>作者：GTA玩家 oolpploo</p>' +
      '<p class="text-muted">联系：2453133436@qq.com</p>' +
      '<p class="text-muted">版本 <span id="about-version">v' + (GTA.APP_VERSION || '10.27.0') + '</span></p>' +
    '</div>';
  }

  function renderDisclaimer() {
    return '<div class="settings-card">' +
      '<h3>免责声明</h3>' +
      '<ul style="font-size:var(--font-size-xs);color:var(--color-text-muted);line-height:1.8;">' +
        '<li>本软件为免费工具，仅供个人学习与游戏辅助用途，不得用于商业目的。</li>' +
        '<li>车辆数据来源于公开页面，版权归原作者及平台所有。</li>' +
        '<li>软件不包含任何游戏内修改、外挂或作弊功能。</li>' +
        '<li>使用本软件产生的任何账号问题、数据丢失或其他损失，开发者不承担任何责任。</li>' +
        '<li>GTA、Grand Theft Auto 及相关商标为 Rockstar Games 所有。</li>' +
      '</ul>' +
    '</div>';
  }

  // ── Player name ──
  async function loadPlayerName() {
    try {
      await GTA.db.ready();
      var setting = await GTA.db.settings.get('playerName');
      var input = document.getElementById('settings-player-name');
      if (input && setting) input.value = setting.value || '';
    } catch (e) {}
  }

  async function savePlayerName() {
    var input = document.getElementById('settings-player-name');
    if (!input) return;
    var name = input.value.trim();
    try {
      await GTA.db.ready();
      if (name) {
        await GTA.db.settings.put({ key: 'playerName', value: name });
      } else {
        await GTA.db.settings.delete('playerName');
      }
      var status = document.getElementById('settings-name-status');
      if (status) { status.textContent = '已保存'; status.style.color = 'var(--color-success)'; }
    } catch (e) {
      var status = document.getElementById('settings-name-status');
      if (status) { status.textContent = '保存失败'; status.style.color = 'var(--color-danger)'; }
    }
  }

  // ── Display name (Supabase account) ──
  async function loadDisplayName() {
    if (!GTA.AuthService || !GTA.AuthService.isLoggedIn()) return;
    var currentUser = GTA.AuthService.getUser();
    var input = document.getElementById('settings-display-name');
    if (input && currentUser && currentUser.displayName) {
      input.value = currentUser.displayName;
    }
  }

  async function saveDisplayName() {
    var input = document.getElementById('settings-display-name');
    if (!input) return;
    var name = input.value.trim();
    if (!name) { GTA.Toast.warning('名称不能为空'); return; }
    if (!GTA.AuthService || !GTA.AuthService.isLoggedIn()) {
      GTA.Toast.warning('请先登录');
      return;
    }
    try {
      await GTA.AuthService.updateDisplayName(name);
      var status = document.getElementById('settings-display-name-status');
      if (status) { status.textContent = '已保存'; status.style.color = 'var(--color-success)'; }
      GTA.Toast.success('显示名称已更新');
    } catch (e) {
      var status = document.getElementById('settings-display-name-status');
      if (status) { status.textContent = '保存失败: ' + (e.message || ''); status.style.color = 'var(--color-danger)'; }
    }
  }

  // ── Export ──
  async function getExportData() {
    await GTA.db.ready();
    return {
      ownedVehicles: await GTA.db.ownedVehicles.toArray(),
      garages: await GTA.db.garages.toArray(),
      garageVehicles: await GTA.db.garageVehicles.toArray(),
      modifications: await GTA.db.modifications.toArray(),
      photos: await GTA.db.photos.toArray(),
      settings: await GTA.db.settings.toArray(),
      exportedAt: new Date().toISOString()
    };
  }

  async function exportJSON() {
    try {
      var data = await getExportData();
      downloadBlob(JSON.stringify(data, null, 2), 'vaultgta-backup-' + dateStr() + '.json', 'application/json');
      GTA.Toast.success('JSON 已导出');
    } catch (e) {
      GTA.Toast.error('导出失败');
    }
  }

  async function exportCSV() {
    try {
      await GTA.db.ready();
      var owned = await GTA.db.ownedVehicles.toArray();

      // CSV header
      var rows = [['名称', '英文名', '品牌', '类型', '直购价', '分类', 'DLC', '收藏日期'].map(csvEscape).join(',')];

      owned.forEach(function (r) {
        var v = Catalog ? Catalog.getById(r.vehicleId) : null;
        if (!v) return;
        rows.push([
          csvEscape(v.name || ''),
          csvEscape(v._detail ? v._detail.name_eng : ''),
          csvEscape(v.brand || ''),
          csvEscape(v.type || ''),
          v.price_buy || 0,
          csvEscape(v.class_id || ''),
          csvEscape(v.dlc || ''),
          csvEscape(r.addedAt ? new Date(r.addedAt).toISOString().slice(0, 10) : '')
        ].join(','));
      });

      // Add BOM for Excel UTF-8 compatibility
      var bom = '﻿';
      var csv = bom + rows.join('\n');
      downloadBlob(csv, 'vaultgta-vehicles-' + dateStr() + '.csv', 'text/csv;charset=utf-8');
      GTA.Toast.success('CSV 已导出 (' + (rows.length - 1) + ' 辆车)');
    } catch (e) {
      GTA.Toast.error('导出失败');
    }
  }

  function csvEscape(str) {
    if (!str) return '';
    var s = String(str);
    if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function dateStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function downloadBlob(content, filename, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Import ──
  function convertOldFormat(oldData) {
    var ownedVehicles = [];
    var garageMap = {};
    function norm(s) { return s.replace(/\s+/g, '').replace(/[\(\[]/g, '[').replace(/[\)\]]/g, ']').toLowerCase(); }
    var allVehicles = Catalog && Catalog.getAll ? Catalog.getAll() : [];

    oldData.forEach(function (item) {
      if (!item.name) return;
      var vehicleId = null;
      var oldNameNorm = norm(item.name);

      var found = allVehicles.find(function (x) { return x.name === item.name; });
      if (!found) found = allVehicles.find(function (x) { return norm(x.name) === oldNameNorm; });
      if (!found) found = allVehicles.find(function (x) { return item.name.indexOf(x.name) === 0 || x.name.indexOf(item.name) === 0; });
      if (found) vehicleId = found.id;

      if (vehicleId) {
        if (item.owned && !ownedVehicles.find(function (x) { return x.vehicleId === vehicleId; })) {
          ownedVehicles.push({ vehicleId: vehicleId, addedAt: Date.now() });
        }
        if (item.garage && item.garage !== '未选择') {
          if (!garageMap[item.garage]) garageMap[item.garage] = [];
          if (garageMap[item.garage].indexOf(vehicleId) === -1) garageMap[item.garage].push(vehicleId);
          if (!item.owned && !ownedVehicles.find(function (x) { return x.vehicleId === vehicleId; })) {
            ownedVehicles.push({ vehicleId: vehicleId, addedAt: Date.now() });
          }
        }
      }
    });

    var garages = [], garageVehicles = [];
    Object.keys(garageMap).forEach(function (name) {
      garages.push({ name: name, _garageName: name });
      garageMap[name].forEach(function (vid, idx) {
        garageVehicles.push({ _garageName: name, vehicleId: vid, sortOrder: idx });
      });
    });

    return { ownedVehicles: ownedVehicles, garages: garages, garageVehicles: garageVehicles, modifications: [], photos: [], settings: [], exportedAt: '老版迁移' };
  }

  async function importData(file) {
    try {
      var text = await file.text();
      var raw = JSON.parse(text);
      var isOldFormat = Array.isArray(raw);
      if (isOldFormat) raw = convertOldFormat(raw);
      if (!raw.ownedVehicles || !raw.garages) { GTA.Toast.error('无效的备份文件'); return; }

      var infoLines = [
        '<p>将从备份恢复数据，现有数据将被<strong>覆盖</strong>。</p>',
        '<p>备份时间：' + (raw.exportedAt || '未知') + '</p>',
        '<p>收藏车辆：' + raw.ownedVehicles.length + ' 辆 | 车库：' + raw.garages.length + ' 个</p>'
      ];

      GTA.Modal.show({
        title: '确认导入',
        body: infoLines.join(''),
        confirmText: '确认导入',
        cancelText: '取消',
        onConfirm: async function () {
          await GTA.db.ready();
          await GTA.db.ownedVehicles.clear();
          await GTA.db.garages.clear();
          await GTA.db.garageVehicles.clear();
          await GTA.db.modifications.clear();
          await GTA.db.photos.clear();

          if (raw.ownedVehicles.length) await GTA.db.ownedVehicles.bulkPut(raw.ownedVehicles);

          var garageNameToId = {};
          if (raw.garages.length) {
            for (var gi = 0; gi < raw.garages.length; gi++) {
              var g = raw.garages[gi];
              if (isOldFormat) {
                var newId = await GTA.db.garages.add({ name: g.name, sortOrder: gi, createdAt: Date.now() + gi });
                garageNameToId[g._garageName || g.name] = newId;
              } else {
                await GTA.db.garages.put({ id: g.id, name: g.name, sortOrder: g.sortOrder || gi, createdAt: g.createdAt || Date.now() });
                garageNameToId[g.id] = g.id;
              }
            }
          }
          if (raw.garageVehicles.length) {
            for (var gvi = 0; gvi < raw.garageVehicles.length; gvi++) {
              var gv = raw.garageVehicles[gvi];
              var gid = isOldFormat ? garageNameToId[gv._garageName] : gv.garageId;
              if (gid) await GTA.db.garageVehicles.add({ garageId: gid, vehicleId: gv.vehicleId, sortOrder: gv.sortOrder || 0 });
            }
          }
          if (raw.modifications.length) await GTA.db.modifications.bulkPut(raw.modifications);
          if (raw.photos.length) await GTA.db.photos.bulkPut(raw.photos);
          if (raw.settings.length) {
            for (var si = 0; si < raw.settings.length; si++) {
              if (raw.settings[si].key === 'playerName') await GTA.db.settings.put(raw.settings[si]);
            }
          }
          GTA.Toast.success('导入完成，即将刷新');
          setTimeout(function () { location.reload(); }, 1000);
        }
      });
    } catch (e) {
      GTA.Toast.error('文件格式错误');
    }
  }

  async function clearAllData() {
    GTA.Modal.show({
      title: '清除所有数据',
      body: '<p>将<strong>永久删除</strong>所有收藏记录、车库、改装记录和照片。</p><p style="color:var(--color-danger)">此操作不可恢复，请先导出备份。</p>',
      confirmText: '确认清除',
      cancelText: '取消',
      onConfirm: async function () {
        await GTA.db.ready();
        await GTA.db.ownedVehicles.clear();
        await GTA.db.garages.clear();
        await GTA.db.garageVehicles.clear();
        await GTA.db.modifications.clear();
        await GTA.db.photos.clear();
        await GTA.db.settings.clear();
        GTA.Toast.success('所有数据已清除');
        GTA.EventBus.emit('data:cleared');
      }
    });
  }

  function bindUpdate() {
    var btnCheck = document.getElementById('btn-check-update');
    var btnInstall = document.getElementById('btn-install-update');
    var statusEl = document.getElementById('update-status');
    var versionEl = document.getElementById('update-current-version');
    var api = window.electronAPI;

    // Show current version
    if (api && api.getVersion && versionEl) {
      api.getVersion().then(function (v) {
        if (v) {
          versionEl.textContent = 'v' + v;
          var aboutVer = document.getElementById('about-version');
          if (aboutVer) aboutVer.textContent = 'v' + v;
        }
      });
    }

    if (btnCheck) {
      btnCheck.addEventListener('click', async function () {
        if (!api || !api.checkUpdate) {
          statusEl.textContent = '仅在桌面应用中可用';
          statusEl.style.color = 'var(--color-text-muted)';
          return;
        }
        btnCheck.disabled = true;
        statusEl.textContent = '正在检查更新...';
        statusEl.style.color = 'var(--color-text-muted)';
        try {
          await api.checkUpdate();
        } catch (e) {
          statusEl.textContent = '检查更新失败';
          statusEl.style.color = 'var(--color-danger)';
          btnCheck.disabled = false;
        }
      });
    }

    if (btnInstall) {
      btnInstall.addEventListener('click', function () {
        if (api && api.installUpdate) api.installUpdate();
      });
    }

    // Listen for update status from main process
    if (api && api.onUpdateStatus) {
      api.onUpdateStatus(function (data) {
        if (statusEl) {
          statusEl.textContent = data.message;
          if (data.status === 'error') {
            statusEl.style.color = 'var(--color-danger)';
          } else if (data.status === 'downloaded') {
            statusEl.style.color = 'var(--color-success)';
          } else if (data.status === 'latest') {
            statusEl.style.color = 'var(--color-success)';
          } else {
            statusEl.style.color = 'var(--color-text-muted)';
          }
        }
        if (data.status === 'downloaded') {
          if (btnCheck) btnCheck.style.display = 'none';
          if (btnInstall) btnInstall.style.display = '';
        }
        if (data.status === 'available' || data.status === 'downloading') {
          if (btnCheck) btnCheck.style.display = 'none';
        }
        if (data.status === 'error' || data.status === 'latest') {
          if (btnCheck) { btnCheck.style.display = ''; btnCheck.disabled = false; }
          if (btnInstall) btnInstall.style.display = 'none';
        }
      });
    }
  }

  function bindButtons() {
    var btnSaveName = document.getElementById('btn-save-name');
    if (btnSaveName) btnSaveName.addEventListener('click', savePlayerName);

    var btnSaveDisplayName = document.getElementById('btn-save-display-name');
    if (btnSaveDisplayName) btnSaveDisplayName.addEventListener('click', saveDisplayName);

    var btnExportJSON = document.getElementById('btn-export-json');
    if (btnExportJSON) btnExportJSON.addEventListener('click', exportJSON);

    var btnExportCSV = document.getElementById('btn-export-csv');
    if (btnExportCSV) btnExportCSV.addEventListener('click', exportCSV);

    var btnImport = document.getElementById('btn-import-data');
    var fileInput = document.getElementById('import-file-input');
    if (btnImport && fileInput) {
      btnImport.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        if (this.files.length) { importData(this.files[0]); this.value = ''; }
      });
    }

    var btnClear = document.getElementById('btn-clear-data');
    if (btnClear) btnClear.addEventListener('click', clearAllData);

    bindUpdate();

    updateCloudStatus();
    var btnUpload = document.getElementById('btn-cloud-upload');
    var btnDownload = document.getElementById('btn-cloud-download');
    if (btnUpload) btnUpload.addEventListener('click', function () { GTA.SupabaseService.upload(); });
    if (btnDownload) btnDownload.addEventListener('click', function () { GTA.SupabaseService.download(); });

    // Listen for sync loading state to disable buttons during sync
    GTA.EventBus.on('sync:loading', function (state) {
      if (btnUpload) btnUpload.disabled = (state.status === 'started');
      if (btnDownload) btnDownload.disabled = (state.status === 'started');
    });
  }

  function updateCloudStatus() {
    var status = document.getElementById('cloud-status');
    if (!status) return;
    var loggedIn = GTA.AuthService && GTA.AuthService.getCurrentUser && GTA.AuthService.getCurrentUser();
    if (loggedIn) {
      status.textContent = '已登录：' + (loggedIn.email || loggedIn.uid);
      status.style.color = 'var(--color-success)';
    } else {
      status.textContent = '请先登录后使用云端功能';
      status.style.color = 'var(--color-text-muted)';
    }
  }

  function destroy() {}

  return { init: init, destroy: destroy };
})();
