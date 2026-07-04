/* ===== Share Card Page ===== */
window.GTA = window.GTA || {};

GTA.Share = (function () {
  var Utils = GTA.Utils;
  var wallpaperUrls = [];
  var currentWallpaperIndex = -1;

  // GTA V 4K wallpapers from getwallpapers.com
  var GTA_WALLPAPERS = [
    'https://getwallpapers.com/wallpaper/full/5/a/3/441723.jpg',
    'https://getwallpapers.com/wallpaper/full/4/1/0/439926.jpg',
    'https://getwallpapers.com/wallpaper/full/9/6/0/440887.jpg',
    'https://getwallpapers.com/wallpaper/full/1/f/e/440378.jpg',
    'https://getwallpapers.com/wallpaper/full/5/1/3/440587.jpg',
    'https://getwallpapers.com/wallpaper/full/8/d/0/441129.jpg',
    'https://getwallpapers.com/wallpaper/full/2/6/6/440102.jpg',
    'https://getwallpapers.com/wallpaper/full/6/2/0/440568.jpg',
    'https://getwallpapers.com/wallpaper/full/d/7/f/439990.jpg',
    'https://getwallpapers.com/wallpaper/full/7/3/d/441158.jpg',
    'https://getwallpapers.com/wallpaper/full/9/4/0/440636.jpg',
    'https://getwallpapers.com/wallpaper/full/b/e/0/440356.jpg',
    'https://getwallpapers.com/wallpaper/full/4/9/0/440972.jpg',
    'https://getwallpapers.com/wallpaper/full/f/3/d/441666.jpg',
    'https://getwallpapers.com/wallpaper/full/4/b/8/441635.jpg',
    'https://getwallpapers.com/wallpaper/full/6/6/9/441758.jpg',
    'https://getwallpapers.com/wallpaper/full/5/5/6/440208.jpg',
    'https://getwallpapers.com/wallpaper/full/7/9/2/441996.jpg',
    'https://getwallpapers.com/wallpaper/full/d/1/3/439660.jpg',
    'https://getwallpapers.com/wallpaper/full/7/f/1/441177.jpg',
    'https://getwallpapers.com/wallpaper/full/e/0/0/441602.jpg',
    'https://getwallpapers.com/wallpaper/full/d/e/8/439963.jpg',
    'https://getwallpapers.com/wallpaper/full/d/3/c/441211.jpg',
    'https://getwallpapers.com/wallpaper/full/0/6/b/440687.jpg',
    'https://getwallpapers.com/wallpaper/full/2/3/9/440167.jpg',
    'https://getwallpapers.com/wallpaper/full/9/b/0/440412.jpg',
    'https://getwallpapers.com/wallpaper/full/4/4/d/440913.jpg',
    'https://getwallpapers.com/wallpaper/full/7/5/5/440048.jpg',
    'https://getwallpapers.com/wallpaper/full/4/7/a/441849.jpg',
    'https://getwallpapers.com/wallpaper/full/d/c/7/442105.jpg',
    'https://getwallpapers.com/wallpaper/full/6/e/9/441901.jpg',
    'https://getwallpapers.com/wallpaper/full/1/2/c/441871.jpg'
  ];

  function init() {
    GTA.log('[Share] Init');

    // Ensure card structure has background elements
    ensureCardStructure();

    // Load player name from settings
    loadPlayerName();

    // Load wallpapers
    loadWallpapers();

    // Bind download button
    var downloadBtn = document.getElementById('btn-download-share');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', downloadCard);
    }

    // Bind refresh wallpaper buttons (both inside card and in toolbar)
    var refreshBtnCard = document.getElementById('btn-refresh-wallpaper');
    if (refreshBtnCard) {
      refreshBtnCard.addEventListener('click', function (e) {
        e.stopPropagation();
        randomizeWallpaper();
      });
    }
    var refreshBtnToolbar = document.getElementById('btn-refresh-bg');
    if (refreshBtnToolbar) {
      refreshBtnToolbar.addEventListener('click', function () {
        randomizeWallpaper();
      });
    }

    // Bind player name input
    var nameInput = document.getElementById('share-player-name');
    if (nameInput) {
      nameInput.addEventListener('input', function () {
        updatePreview();
        savePlayerName(this.value);
      });
    }

    // Load stats and update preview
    loadStats();
  }

  function destroy() {}

  function ensureCardStructure() {
    var preview = document.getElementById('share-card-preview');
    if (!preview) return;

    // Ensure background layer exists
    if (!preview.querySelector('.share-card-bg')) {
      var bg = document.createElement('div');
      bg.className = 'share-card-bg loading';
      preview.insertBefore(bg, preview.firstChild);
    }

    // Ensure overlay exists
    if (!preview.querySelector('.share-card-overlay')) {
      var overlay = document.createElement('div');
      overlay.className = 'share-card-overlay';
      var bg = preview.querySelector('.share-card-bg');
      if (bg && bg.nextSibling) {
        preview.insertBefore(overlay, bg.nextSibling);
      } else {
        preview.appendChild(overlay);
      }
    }

    // Ensure refresh button exists
    if (!preview.querySelector('.share-card-refresh')) {
      var refreshBtn = document.createElement('button');
      refreshBtn.className = 'share-card-refresh';
      refreshBtn.id = 'btn-refresh-wallpaper';
      refreshBtn.title = '换一张背景';
      refreshBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>';
      refreshBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        randomizeWallpaper();
      });
      preview.appendChild(refreshBtn);
    }
  }

  function loadWallpapers() {
    wallpaperUrls = GTA_WALLPAPERS;
    GTA.log('[Share] Loaded ' + wallpaperUrls.length + ' GTA V wallpapers');
    randomizeWallpaper();
  }

  function randomizeWallpaper() {
    if (wallpaperUrls.length === 0) return;

    var newIndex;
    do {
      newIndex = Math.floor(Math.random() * wallpaperUrls.length);
    } while (newIndex === currentWallpaperIndex && wallpaperUrls.length > 1);

    currentWallpaperIndex = newIndex;
    applyWallpaper(wallpaperUrls[newIndex]);
  }

  function applyWallpaper(url) {
    var bg = document.querySelector('#share-card-preview .share-card-bg');
    if (!bg) return;

    bg.classList.remove('loaded');
    bg.classList.add('loading');

    // Remove old img, insert new real <img> element
    var oldImg = bg.querySelector('.share-card-bg-img');
    if (oldImg) oldImg.remove();

    var imgEl = document.createElement('img');
    imgEl.className = 'share-card-bg-img';
    imgEl.alt = '';
    imgEl.onload = function () {
      bg.classList.remove('loading');
      bg.classList.add('loaded');
    };
    imgEl.onerror = function () {
      console.warn('[Share] Failed to load wallpaper:', url);
      if (wallpaperUrls.length > 1) {
        var nextIdx = (currentWallpaperIndex + 1) % wallpaperUrls.length;
        currentWallpaperIndex = nextIdx;
        applyWallpaper(wallpaperUrls[nextIdx]);
      }
    };
    imgEl.src = url;
    bg.appendChild(imgEl);
  }

  async function loadPlayerName() {
    try {
      await GTA.db.ready();
      var setting = await GTA.db.settings.get('playerName');
      var nameInput = document.getElementById('share-player-name');
      if (nameInput && setting) {
        nameInput.value = setting.value || '';
      }
    } catch (e) {
      // Ignore
    }
  }

  async function savePlayerName(name) {
    try {
      await GTA.db.ready();
      await GTA.db.settings.put({ key: 'playerName', value: name });
    } catch (e) {
      // Ignore
    }
  }

  async function loadStats() {
    try {
      var stats = await GTA.Stats.getDashboardStats();
      await GTA.db.ready();
      var garageCount = await GTA.db.garages.count();
      stats.garageCount = garageCount;

      var nameInput = document.getElementById('share-player-name');
      var playerName = nameInput ? nameInput.value : '';

      GTA.ShareCard.populateCard(stats, playerName);
    } catch (e) {
      console.error('[Share] Stats error:', e);
    }
  }

  function updatePreview() {
    loadStats();
  }

  async function downloadCard() {
    try {
      var canvas = await GTA.ShareCard.generateCard();
      var filename = 'VaultGTA-' + new Date().toISOString().slice(0, 10) + '.png';

      var saved = await GTA.ShareCard.downloadNative(canvas, filename);

      if (saved) {
        GTA.Toast.success('分享卡片已保存！');
      } else if (saved === false) {
        // User cancelled save dialog
      } else {
        GTA.Toast.success('分享卡片已下载！');
      }
    } catch (e) {
      console.error('[Share] Download error:', e);
      GTA.Toast.error('生成分享卡片失败');
    }
  }

  return { init: init, destroy: destroy };
})();
