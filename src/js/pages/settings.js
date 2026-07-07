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
        renderTheme() +
        renderCloudSync() +
        renderAutoUpdate() +
        renderDataActions() +
        renderBackgroundVideo() +
        renderDisclaimer() +
      '</div>';

    loadPlayerName();
    updateBgStatus();
    bindButtons();
  }

  function renderPlayerName() {
    return '<div class="settings-card">' +
      '<h3>玩家名称</h3>' +
      '<p>将显示在侧边栏和分享卡片上。</p>' +
      '<div class="settings-row">' +
        '<input type="text" class="form-input" id="settings-player-name" placeholder="输入你的玩家名称" maxlength="30">' +
        '<button class="btn btn-primary" id="btn-save-name">保存</button>' +
      '</div>' +
      '<p class="text-muted" style="margin-top:var(--space-xs)" id="settings-name-status"></p>' +
    '</div>';
  }

  function renderAutoUpdate() {
    return '<div class="settings-card">' +
      '<h3>软件更新</h3>' +
      '<p>当前版本：<span id="update-current-version">v' + (GTA.APP_VERSION || '未知') + '</span></p>' +
      '<div class="settings-row">' +
        '<button class="btn btn-primary" id="btn-check-update">检查更新</button>' +
        '<button class="btn btn-primary" id="btn-download-update" style="display:none">下载更新</button>' +
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

  function renderTheme() {
    return '<div class="settings-card">' +
      '<h3>主题配色</h3>' +
      '<p>切换软件整体色调风格。</p>' +
      '<div class="theme-preset-grid" id="theme-preset-grid">' +
        '<div class="theme-preset-item active" data-theme="black-gold" title="黑金（默认）">' +
          '<span class="theme-swatch" style="background:linear-gradient(135deg,#1a1a1a,#d4a843);"></span>' +
          '<span class="theme-label">黑金</span>' +
        '</div>' +
        '<div class="theme-preset-item" data-theme="blue" title="洛圣都蓝">' +
          '<span class="theme-swatch" style="background:linear-gradient(135deg,#0d1528,#3b7dd8);"></span>' +
          '<span class="theme-label">洛圣都蓝</span>' +
        '</div>' +
        '<div class="theme-preset-item" data-theme="purple" title="自由市紫">' +
          '<span class="theme-swatch" style="background:linear-gradient(135deg,#1a0d28,#8b3bd8);"></span>' +
          '<span class="theme-label">自由市紫</span>' +
        '</div>' +
      '</div>' +
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

  function renderBackgroundVideo() {
    return '<div class="settings-card">' +
      '<h3>自定义背景</h3>' +
      '<p style="color:var(--color-gold);font-size:var(--font-size-xs);margin-bottom:var(--space-sm);">💡 建议使用深色、低对比度、模糊/高斯风格的图片或视频，以确保文字清晰可读，获得最佳视觉体验。</p>' +

      // Presets
      '<div style="margin-bottom:var(--space-md);">' +
        '<label style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-bottom:6px;display:block;">预设背景</label>' +
        '<div class="bg-preset-grid" id="bg-preset-grid">' +
          '<div class="bg-preset-item active" data-preset="default" style="background:linear-gradient(135deg, #0d0d1a 0%, #141428 50%, #0f0f1e 100%);" title="默认暗夜"></div>' +
          '<div class="bg-preset-item" data-preset="ocean" style="background:linear-gradient(135deg, #0a1428 0%, #0f1f3d 40%, #0c1a30 100%);" title="深海"></div>' +
          '<div class="bg-preset-item" data-preset="sunset" style="background:linear-gradient(135deg, #1e1410 0%, #2a1a18 40%, #1a1310 100%);" title="余晖"></div>' +
          '<div class="bg-preset-item" data-preset="forest" style="background:linear-gradient(135deg, #0d1410 0%, #16241a 50%, #0e1612 100%);" title="森林"></div>' +
          '<div class="bg-preset-item" data-preset="midnight" style="background:linear-gradient(135deg, #100d1e 0%, #1a1030 50%, #120e22 100%);" title="午夜"></div>' +
        '</div>' +
      '</div>' +

      // Custom image
      '<div class="settings-row" style="margin-bottom:var(--space-sm);">' +
        '<button class="btn btn-primary" id="btn-select-bg-image">选择背景图片</button>' +
        '<button class="btn btn-secondary" id="btn-remove-bg-image">移除图片</button>' +
      '</div>' +

      // Custom video
      '<div class="settings-row" style="margin-bottom:var(--space-sm);">' +
        '<button class="btn btn-primary" id="btn-select-bg-video">选择背景视频</button>' +
        '<button class="btn btn-secondary" id="btn-reset-bg-video">恢复默认</button>' +
      '</div>' +

      // Brightness
      '<div class="settings-row" style="align-items:center;gap:var(--space-md);">' +
        '<label style="white-space:nowrap;font-size:var(--font-size-sm);color:var(--color-text-secondary);">背景亮度</label>' +
        '<input type="range" id="bg-brightness-slider" min="10" max="100" value="35" style="flex:1;">' +
        '<span id="bg-brightness-val" style="min-width:36px;text-align:right;font-size:var(--font-size-sm);">35%</span>' +
      '</div>' +
      '<p class="text-muted" style="margin-top:var(--space-xs)" id="bg-video-status">当前：默认背景</p>' +
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
                var newId = await GTA.db.garages.add({
                  name: g.name,
                  slotIndex: g.slotIndex !== undefined ? g.slotIndex : gi,
                  enabled: g.enabled !== undefined ? g.enabled : true,
                  propertyName: g.propertyName || g.name,
                  propertyCategory: g.propertyCategory || '已导入',
                  propertyType: g.propertyType || 'imported',
                  slotCount: g.slotCount || 10,
                  floors: g.floors || 1,
                  floor: g.floor || 1,
                  location: g.location || g.name,
                  sortOrder: gi,
                  createdAt: Date.now() + gi
                });
                garageNameToId[g._garageName || g.name] = newId;
              } else {
                // Auto-merge: find matching preset by cleaned name
                var importClean = (g.name || '').replace(/\s+/g, '').replace(/[，,、.\-－_—]/g, '').toLowerCase();
                var existingGarages = await GTA.db.garages.toArray();
                var merged = false;
                // First try exact match on location/propertyName
                for (var eg = 0; eg < existingGarages.length; eg++) {
                  var eg2 = existingGarages[eg];
                  var egClean = (eg2.location || eg2.propertyName || '').replace(/\s+/g, '').replace(/[，,、.\-－_—]/g, '').toLowerCase();
                  if (importClean && egClean && importClean === egClean && importClean.length >= 3) {
                    garageNameToId[g.id] = eg2.id;
                    if (!eg2.enabled) { await GTA.db.garages.update(eg2.id, { enabled: true, location: g.name }); }
                    merged = true;
                    break;
                  }
                }
                // Then try matching by type: find unused preset slot of same type
                if (!merged) {
                  var importCleanNoNum = importClean.replace(/\d+/g, '').replace(/[bB]层?|地下|车库/g, '');
                  for (var eg3 = 0; eg3 < existingGarages.length; eg3++) {
                    var eg4 = existingGarages[eg3];
                    if (eg4.enabled) continue;
                    var egClean2 = (eg4.propertyName || '').replace(/\s+/g, '').replace(/[，,、.\-－_—\d]/g, '').toLowerCase();
                    if (importCleanNoNum && egClean2 && importCleanNoNum.indexOf(egClean2) >= 0 && egClean2.length >= 2) {
                      garageNameToId[g.id] = eg4.id;
                      await GTA.db.garages.update(eg4.id, { enabled: true, location: g.name });
                      merged = true;
                      break;
                    }
                  }
                }
                if (!merged) {
                  var newId = await GTA.db.garages.add({
                    name: g.name || g.propertyName || '未命名',
                    slotIndex: g.slotIndex !== undefined ? g.slotIndex : gi,
                    enabled: g.enabled !== undefined ? g.enabled : true,
                    propertyName: g.propertyName || g.name || '未命名',
                    propertyCategory: g.propertyCategory || '已导入',
                    propertyType: g.propertyType || 'imported',
                    slotCount: g.slotCount || 10,
                    floors: g.floors || 1,
                    floor: g.floor || 1,
                    location: g.location || g.name || null,
                    sortOrder: g.sortOrder || gi,
                    createdAt: g.createdAt || Date.now()
                  });
                  garageNameToId[g.id] = newId;
                }
              }
            }
          }
          if (raw.garageVehicles.length) {
            for (var gvi = 0; gvi < raw.garageVehicles.length; gvi++) {
              var gv = raw.garageVehicles[gvi];
              var gid = isOldFormat ? garageNameToId[gv._garageName] : (garageNameToId[gv.garageId] || gv.garageId);
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
    var btnDownload = document.getElementById('btn-download-update');
    var btnInstall = document.getElementById('btn-install-update');
    var statusEl = document.getElementById('update-status');
    var versionEl = document.getElementById('update-current-version');
    var api = window.electronAPI;

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
          if (statusEl) { statusEl.textContent = '仅在桌面应用中可用'; statusEl.style.color = 'var(--color-text-muted)'; }
          return;
        }
        btnCheck.disabled = true;
        if (statusEl) { statusEl.textContent = '正在检查更新...'; statusEl.style.color = 'var(--color-text-muted)'; }
        try {
          await api.checkUpdate();
        } catch (e) {
          if (statusEl) { statusEl.textContent = '检查更新失败'; statusEl.style.color = 'var(--color-danger)'; }
          btnCheck.disabled = false;
        }
      });
    }

    if (btnDownload) {
      btnDownload.addEventListener('click', async function () {
        btnDownload.disabled = true;
        if (statusEl) { statusEl.textContent = '正在下载更新...'; statusEl.style.color = 'var(--color-text-muted)'; }
        try {
          await api.downloadUpdate();
        } catch (e) {
          if (statusEl) { statusEl.textContent = '下载失败'; statusEl.style.color = 'var(--color-danger)'; }
          btnDownload.disabled = false;
        }
      });
    }

    if (btnInstall) {
      btnInstall.addEventListener('click', function () {
        if (api && api.installUpdate) api.installUpdate();
      });
    }

    if (api && api.onUpdateStatus) {
      api.onUpdateStatus(function (data) {
        if (statusEl) {
          statusEl.textContent = data.message;
          if (data.status === 'error') statusEl.style.color = 'var(--color-danger)';
          else if (data.status === 'downloaded') statusEl.style.color = 'var(--color-success)';
          else if (data.status === 'latest') statusEl.style.color = 'var(--color-success)';
          else statusEl.style.color = 'var(--color-text-muted)';
          if (btnCheck) btnCheck.disabled = false;
        }
        if (data.status === 'available') {
          if (btnDownload) { btnDownload.style.display = ''; btnDownload.disabled = false; }
          if (btnCheck) btnCheck.style.display = 'none';
          if (btnInstall) btnInstall.style.display = 'none';
        }
        if (data.status === 'downloading') {
          if (btnDownload) btnDownload.style.display = 'none';
          if (btnCheck) btnCheck.style.display = 'none';
        }
        if (data.status === 'downloaded') {
          if (btnInstall) btnInstall.style.display = '';
          if (btnDownload) btnDownload.style.display = 'none';
          if (btnCheck) btnCheck.style.display = 'none';
        }
        if (data.status === 'error' || data.status === 'latest') {
          if (btnCheck) { btnCheck.style.display = ''; btnCheck.disabled = false; }
          if (btnDownload) btnDownload.style.display = 'none';
          if (btnInstall) btnInstall.style.display = 'none';
        }
      });
    }
  }

  function bindButtons() {
    var btnSaveName = document.getElementById('btn-save-name');
    if (btnSaveName) btnSaveName.addEventListener('click', savePlayerName);

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
    bindTheme();

    var btnUpload = document.getElementById('btn-cloud-upload');
    var btnDownload = document.getElementById('btn-cloud-download');
    if (btnUpload) btnUpload.addEventListener('click', function () { GTA.SupabaseService.upload(); });
    if (btnDownload) btnDownload.addEventListener('click', function () { GTA.SupabaseService.download(); });

    var btnSelectBg = document.getElementById('btn-select-bg-video');
    var btnResetBg = document.getElementById('btn-reset-bg-video');
    if (btnSelectBg) btnSelectBg.addEventListener('click', selectBgVideo);
    if (btnResetBg) btnResetBg.addEventListener('click', resetBgVideo);

    var btnSelectImg = document.getElementById('btn-select-bg-image');
    var btnRemoveImg = document.getElementById('btn-remove-bg-image');
    if (btnSelectImg) btnSelectImg.addEventListener('click', selectBgImage);
    if (btnRemoveImg) btnRemoveImg.addEventListener('click', removeBgImage);

    // Preset background clicks
    var presetItems = document.querySelectorAll('.bg-preset-item');
    // Sync active state from saved preset
    GTA.db.ready().then(function () {
      return GTA.db.settings.get('bgPreset');
    }).then(function (entry) {
      if (entry && entry.value) {
        presetItems.forEach(function (el) {
          el.classList.toggle('active', el.getAttribute('data-preset') === entry.value);
        });
      }
    }).catch(function () {});
    presetItems.forEach(function (item) {
      item.addEventListener('click', function () {
        var presetId = this.getAttribute('data-preset');
        presetItems.forEach(function (el) { el.classList.remove('active'); });
        this.classList.add('active');
        if (GTA.BackgroundVideo && GTA.BackgroundVideo.setPreset) {
          GTA.BackgroundVideo.setPreset(presetId);
        }
        updateBgStatus();
      });
    });

    // Background brightness slider
    var brightnessSlider = document.getElementById('bg-brightness-slider');
    var brightnessVal = document.getElementById('bg-brightness-val');
    if (brightnessSlider) {
      // Load saved value
      GTA.db.ready().then(function () {
        return GTA.db.settings.get('bgBrightness');
      }).then(function (entry) {
        if (entry && entry.value) {
          brightnessSlider.value = entry.value;
          if (brightnessVal) brightnessVal.textContent = entry.value + '%';
          applyBgBrightness(parseInt(entry.value, 10));
        }
      }).catch(function () {});
      brightnessSlider.addEventListener('input', function () {
        var val = parseInt(this.value, 10);
        if (brightnessVal) brightnessVal.textContent = val + '%';
        applyBgBrightness(val);
        GTA.db.ready().then(function () {
          GTA.db.settings.put({ key: 'bgBrightness', value: val });
        });
      });
    }

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

  // ── Background Video ──

  async function selectBgVideo() {
    var api = window.electronAPI;
    if (!api) { GTA.Toast.info('仅桌面版支持'); return; }
    try {
      var path = await api.selectBackgroundVideo();
      if (path) {
        if (GTA.BackgroundVideo) GTA.BackgroundVideo.setVideo(path);
        GTA.Toast.success('背景视频已更新');
        updateBgStatus();
      }
    } catch (e) {
      GTA.Toast.error('选择视频失败：' + (e.message || e));
    }
  }

  async function resetBgVideo() {
    var api = window.electronAPI;
    if (!api) return;
    try {
      await api.removeBackgroundVideo();
      if (GTA.BackgroundVideo) GTA.BackgroundVideo.resetVideo();
      GTA.Toast.success('已恢复默认背景');
      updateBgStatus();
    } catch (e) {
      GTA.Toast.error('恢复失败：' + (e.message || e));
    }
  }

  async function selectBgImage() {
    var api = window.electronAPI;
    if (!api) { GTA.Toast.info('仅桌面版支持'); return; }
    try {
      var path = await api.selectBackgroundImage();
      if (path) {
        if (GTA.BackgroundVideo) {
          GTA.BackgroundVideo.setImage(path);
          GTA.BackgroundVideo.clearPreset();
        }
        // Clear active preset
        document.querySelectorAll('.bg-preset-item').forEach(function (el) { el.classList.remove('active'); });
        GTA.Toast.success('背景图片已更新');
        updateBgStatus();
      }
    } catch (e) {
      GTA.Toast.error('选择图片失败：' + (e.message || e));
    }
  }

  async function removeBgImage() {
    var api = window.electronAPI;
    if (!api) return;
    try {
      await api.removeBackgroundImage();
      if (GTA.BackgroundVideo) GTA.BackgroundVideo.resetImage();
      // Reset preset to default
      document.querySelectorAll('.bg-preset-item').forEach(function (el) { el.classList.remove('active'); });
      var defaultItem = document.querySelector('.bg-preset-item[data-preset="default"]');
      if (defaultItem) defaultItem.classList.add('active');
      GTA.Toast.success('已移除背景图片');
      updateBgStatus();
    } catch (e) {
      GTA.Toast.error('移除失败：' + (e.message || e));
    }
  }

  function updateBgStatus() {
    var status = document.getElementById('bg-video-status');
    if (!status) return;
    var api = window.electronAPI;
    if (!api) { status.textContent = '当前：默认背景（仅桌面版支持自定义）'; return; }
    try {
      Promise.all([
        api.getBackgroundImagePath(),
        api.getBackgroundVideoPath()
      ]).then(function (results) {
        var imgPath = results[0];
        var vidPath = results[1];
        if (imgPath) {
          status.textContent = '当前：自定义图片';
        } else if (vidPath) {
          var name = vidPath.split(/[\\/]/).pop();
          status.textContent = '当前：' + name;
        } else {
          // Check preset
          GTA.db.ready().then(function () {
            return GTA.db.settings.get('bgPreset');
          }).then(function (entry) {
            if (entry && entry.value && entry.value !== 'default') {
              var names = { ocean: '深海', sunset: '余晖', forest: '森林', midnight: '午夜' };
              status.textContent = '当前：预设 - ' + (names[entry.value] || entry.value);
            } else {
              status.textContent = '当前：默认背景';
            }
          }).catch(function () {
            status.textContent = '当前：默认背景';
          });
        }
      }).catch(function () {
        status.textContent = '当前：默认背景';
      });
    } catch (e) { status.textContent = '当前：默认背景'; }
  }

  function applyBgBrightness(val) {
    var overlay = document.getElementById('bg-overlay');
    var video = document.getElementById('bg-video');
    var img = document.getElementById('bg-image');
    if (overlay) {
      var opacity = Math.max(0, (0.8 - val / 100 * 0.78));
      overlay.style.background = 'rgba(0, 0, 0, ' + opacity.toFixed(3) + ')';
    }
    if (video) {
      var brightness = Math.min(1, (0.1 + val / 100 * 0.75));
      video.style.filter = 'brightness(' + brightness.toFixed(3) + ') saturate(1)';
    }
    if (img) {
      var brightness2 = Math.min(1, (0.15 + val / 100 * 0.7));
      img.style.filter = 'brightness(' + brightness2.toFixed(3) + ')';
    }
  }

  function destroy() {}

  return { init: init, destroy: destroy, applyBgBrightness: applyBgBrightness };
})();
