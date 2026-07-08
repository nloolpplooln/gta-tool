/* ===== Application Bootstrap ===== */
window.GTA = window.GTA || {};
window.GTA.DEBUG = false;
window.GTA.log = function () { if (window.GTA.DEBUG) console.log.apply(console, arguments); };

GTA.App = (function () {
  async function bootstrap() {
    GTA.log('[App] Starting VaultGTA...');

    GTA.log('[App] Vendor check - Dexie:', typeof Dexie !== 'undefined');
    GTA.log('[App] Vendor check - html2canvas:', typeof html2canvas !== 'undefined');

    try {
      // 1. Init Supabase Auth
      GTA.log('[App] Initializing Supabase Auth...');
      GTA.AuthService.init();

      // 2. Open IndexedDB
      GTA.log('[App] Opening database...');
      await GTA.db.ready();

      // 3. Load vehicle catalog
      GTA.log('[App] Loading vehicle catalog...');
      await GTA.VehicleCatalog.load();

      // 4. Clean up stale DB records (IDs not in catalog)
      GTA.log('[App] Cleaning stale data...');
      await cleanStaleData();

      // 5. Init router (this also handles initial URL)
      GTA.log('[App] Initializing router...');
      GTA.Router.init();

      // 6. Init navbar
      GTA.log('[App] Initializing navbar...');
      GTA.Navbar.init();
      GTA.Navbar.updateBadge();

      // 7. Auto-detect Steam name & R* avatar (non-blocking)
      detectProfileInfo();

      // 8. Init background video (custom or default)
      initBackground();

      // 9. Init theme
      if (GTA.Theme) GTA.Theme.init();

      GTA.log('[App] Bootstrap complete!');

    } catch (err) {
      console.error('[App] Bootstrap failed:', err);
      showError(err.message || '应用初始化失败');
    }
  }

  /**
   * Remove owned vehicles whose IDs don't exist in the current catalog
   */
  async function cleanStaleData() {
    try {
      var owned = await GTA.db.ownedVehicles.toArray();
      var removed = 0;
      for (var i = 0; i < owned.length; i++) {
        if (!GTA.VehicleCatalog.getById(owned[i].vehicleId)) {
          await GTA.db.ownedVehicles.delete(owned[i].vehicleId);
          GTA.log('[App] Removed stale owned vehicle:', owned[i].vehicleId);
          removed++;
        }
      }
      // Also clean garage vehicles with stale IDs
      var gvAll = await GTA.db.garageVehicles.toArray();
      for (var j = 0; j < gvAll.length; j++) {
        if (!GTA.VehicleCatalog.getById(gvAll[j].vehicleId)) {
          await GTA.db.garageVehicles.delete(gvAll[j].id);
          GTA.log('[App] Removed stale garage vehicle:', gvAll[j].vehicleId);
          removed++;
        }
      }
      if (removed > 0) {
        GTA.log('[App] Cleaned ' + removed + ' stale records');
      }
    } catch (e) {
      console.warn('[App] Cleanup error:', e.message);
    }
  }

  /**
   * Auto-detect Steam display name and R* avatar.
   * Runs non-blocking — failures are silent, results cached in IndexedDB.
   */
  async function detectProfileInfo() {
    var api = window.electronAPI;
    if (!api) return; // Not in Electron

    // Detect Steam name + avatar
    try {
      GTA.log('[App] Detecting Steam...');
      var steam = await api.getSteamDisplayName();
      GTA.log('[App] Steam name result:', JSON.stringify(steam));
      if (steam && steam.success && steam.displayName) {
        await GTA.db.ready();
        await GTA.db.settings.put({ key: 'steamDisplayName', value: steam.displayName });
        GTA.EventBus.emit('steam:detected', { displayName: steam.displayName });
        GTA.log('[App] Steam name:', steam.displayName);
      }

      // Also try Steam avatar
      var steamAvatar = await api.getSteamAvatar();
      GTA.log('[App] Steam avatar result:', JSON.stringify(steamAvatar));
      if (steamAvatar && steamAvatar.success && steamAvatar.dataUrl) {
        await GTA.db.ready();
        await GTA.db.settings.put({ key: 'steamAvatar', value: steamAvatar.dataUrl });
        GTA.EventBus.emit('steam:avatar', { dataUrl: steamAvatar.dataUrl });
        GTA.log('[App] Steam avatar OK');
      }
    } catch (e) {
      console.error('[App] Steam detection error:', e.message || e);
    }

    // Detect R* avatar
    try {
      GTA.log('[App] Detecting R* avatar...');
      var rstar = await api.getRockstarAvatar();
      GTA.log('[App] R* result:', JSON.stringify(rstar));
      if (rstar && rstar.success && rstar.dataUrl) {
        await GTA.db.ready();
        await GTA.db.settings.put({ key: 'rstarAvatar', value: rstar.dataUrl });
        await GTA.db.settings.put({ key: 'rstarNickname', value: rstar.nickname || '' });
        GTA.EventBus.emit('rockstar:detected', { dataUrl: rstar.dataUrl, nickname: rstar.nickname });
        GTA.log('[App] R* avatar detected');
        GTA.Toast.success('R* 头像已获取');
      } else {
        var errMsg = rstar && rstar.error ? rstar.error : 'unknown';
        var errDetail = rstar && rstar.detail ? ' | ' + rstar.detail : '';
        GTA.log('[App] R* not detected:', errMsg, errDetail);
        if (errMsg === 'cache_not_found') {
          GTA.Toast.warning('R*头像: 未找到缓存（需至少进一次GTA5线上模式）');
        } else {
          GTA.Toast.warning('R*头像: ' + errMsg + errDetail);
        }
      }
    } catch (e) {
      console.error('[App] R* detection error:', e.message || e);
      GTA.Toast.warning('R* 检测异常: ' + (e.message || e));
    }
  }

  /**
   * Load custom background (video, image, or preset) + saved brightness
   */
  async function initBackground() {
    var api = window.electronAPI;
    var video = document.getElementById('bg-video');
    var img = document.getElementById('bg-image');

    // Load saved brightness
    try {
      await GTA.db.ready();
      var entry = await GTA.db.settings.get('bgBrightness');
      if (entry && entry.value && GTA.Settings && GTA.Settings.applyBgBrightness) {
        GTA.Settings.applyBgBrightness(entry.value);
      }
    } catch (e) {}

    // Load saved preset
    try {
      var presetEntry = await GTA.db.settings.get('bgPreset');
      if (presetEntry && presetEntry.value) {
        applyPreset(presetEntry.value);
        return;
      }
    } catch (e) {}

    if (api) {
      // Try image first (takes precedence over video)
      try {
        var imgUrl = await api.getBackgroundImagePath();
        if (imgUrl && img) {
          var cb = imgUrl.indexOf('?') === -1 ? '?t=' + Date.now() : '&t=' + Date.now();
          img.style.backgroundImage = 'url(' + imgUrl + cb + ')';
          img.style.display = 'block';
          if (video) video.style.display = 'none';
          return;
        }
      } catch (e) {}

      try {
        var videoUrl = await api.getBackgroundVideoPath();
        if (videoUrl && video) {
          video.src = videoUrl;
          video.style.display = 'block';
          if (img) img.style.display = 'none';
          video.load();
          return;
        }
      } catch (e) {
        console.warn('[App] Failed to load custom video:', e.message);
      }
    }

    // No custom background — hide both, CSS background shows
    if (video) video.style.display = 'none';
    if (img) img.style.display = 'none';
  }

  // Preset definitions (CSS-based, no external files needed)
  var PRESETS = {
    'default': 'linear-gradient(135deg, #0d0d1a 0%, #141428 50%, #0f0f1e 100%)',
    'ocean': 'linear-gradient(135deg, #0a1428 0%, #0f1f3d 40%, #0c1a30 100%)',
    'sunset': 'linear-gradient(135deg, #1e1410 0%, #2a1a18 40%, #1a1310 100%)',
    'forest': 'linear-gradient(135deg, #0d1410 0%, #16241a 50%, #0e1612 100%)',
    'midnight': 'linear-gradient(135deg, #100d1e 0%, #1a1030 50%, #120e22 100%)'
  };

  function applyPreset(presetId) {
    var gradient = PRESETS[presetId] || PRESETS['default'];
    var video = document.getElementById('bg-video');
    var img = document.getElementById('bg-image');
    if (video) video.style.display = 'none';
    if (img) {
      img.style.backgroundImage = gradient;
      img.style.display = 'block';
    }
  }

  // ===== Theme System =====
  GTA.Theme = {
    apply: function(theme) {
      document.documentElement.setAttribute('data-theme', theme === 'black-gold' ? '' : theme);
      GTA.db.ready().then(function() {
        GTA.db.settings.put({ key: 'theme', value: theme });
      });
    },
    init: function() {
      GTA.db.ready().then(function() {
        return GTA.db.settings.get('theme');
      }).then(function(entry) {
        if (entry && entry.value) {
          GTA.Theme.apply(entry.value);
        }
      }).catch(function() {});
    }
  };

  // Expose for settings page to refresh after selection
  GTA.BackgroundVideo = {
    setVideo: function (url) {
      var video = document.getElementById('bg-video');
      var img = document.getElementById('bg-image');
      if (!video) return;
      if (img) img.style.display = 'none';
      video.src = url;
      video.style.display = 'block';
      video.load();
    },
    resetVideo: function () {
      var video = document.getElementById('bg-video');
      var img = document.getElementById('bg-image');
      if (!video) return;
      video.removeAttribute('src');
      video.style.display = 'none';
      // Restore to default preset
      applyPreset('default');
    },
    setImage: function (url) {
      var video = document.getElementById('bg-video');
      var img = document.getElementById('bg-image');
      if (!img) return;
      if (video) video.style.display = 'none';
      var cacheBust = url.indexOf('?') === -1 ? '?t=' + Date.now() : '&t=' + Date.now();
      img.style.backgroundImage = 'url(' + url + cacheBust + ')';
      img.style.display = 'block';
    },
    resetImage: function () {
      var img = document.getElementById('bg-image');
      if (img) img.style.display = 'none';
      applyPreset('default');
    },
    setPreset: function (presetId) {
      applyPreset(presetId);
      // Save to DB
      GTA.db.ready().then(function () {
        GTA.db.settings.put({ key: 'bgPreset', value: presetId });
      });
    },
    clearPreset: function () {
      GTA.db.ready().then(function () {
        GTA.db.settings.delete('bgPreset');
      });
    },
    PRESETS: PRESETS
  };

  function showError(message) {
    var content = document.getElementById('app-content');
    if (content) {
      content.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:16px;">' +
          '<h2 style="color:var(--color-danger)">⚠️ 初始化失败</h2>' +
          '<p style="color:var(--color-text-secondary)">' + (message || '未知错误') + '</p>' +
          '<p style="color:var(--color-text-muted);font-size:13px;">请确保 vendor 文件已正确放置，并尝试重新启动应用。</p>' +
          '<button class="btn btn-primary" onclick="location.reload()">重试</button>' +
        '</div>';
    }
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  return { bootstrap: bootstrap };
})();
