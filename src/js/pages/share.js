/* ===== Share Card Page ===== */
window.GTA = window.GTA || {};

GTA.Share = (function () {
  var Utils = GTA.Utils;
  var wallpaperUrls = [];
  var currentWallpaperIndex = -1;

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
    ensureBgLayers();
    loadPlayerName();
    loadWallpapers();
    bindButtons();
    loadStats();
  }

  function destroy() {}

  function ensureBgLayers() {
    var preview = document.getElementById('share-card-preview');
    if (!preview) return;
    if (!preview.querySelector('.share-card-bg')) {
      var bg = document.createElement('div');
      bg.className = 'share-card-bg loading';
      preview.insertBefore(bg, preview.firstChild);
    }
    if (!preview.querySelector('.share-card-overlay')) {
      var overlay = document.createElement('div');
      overlay.className = 'share-card-overlay';
      var bg = preview.querySelector('.share-card-bg');
      if (bg) {
        bg.after(overlay);
      } else {
        preview.insertBefore(overlay, preview.firstChild);
      }
    }
  }

  function bindButtons() {
    var downloadBtn = document.getElementById('btn-download-share');
    if (downloadBtn) downloadBtn.addEventListener('click', downloadCard);

    var refreshCardBtn = document.getElementById('btn-refresh-wallpaper');
    if (refreshCardBtn) {
      refreshCardBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        randomizeWallpaper();
      });
    }

    var refreshToolbar = document.getElementById('btn-refresh-bg');
    if (refreshToolbar) {
      refreshToolbar.addEventListener('click', randomizeWallpaper);
    }

    var nameInput = document.getElementById('share-player-name');
    if (nameInput) {
      nameInput.addEventListener('input', function () {
        updatePreview();
        savePlayerName(this.value);
      });
    }
  }

  function loadWallpapers() {
    wallpaperUrls = GTA_WALLPAPERS;
    GTA.log('[Share] Loaded ' + wallpaperUrls.length + ' wallpapers');
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
      if (nameInput && setting) nameInput.value = setting.value || '';
    } catch (e) {}
  }

  async function savePlayerName(name) {
    try {
      await GTA.db.ready();
      await GTA.db.settings.put({ key: 'playerName', value: name });
    } catch (e) {}
  }

  async function loadStats() {
    try {
      var stats = await GTA.Stats.getDashboardStats();
      await GTA.db.ready();
      var nameInput = document.getElementById('share-player-name');
      var playerName = nameInput ? nameInput.value : '';
      GTA.ShareCard.populateCard(stats, playerName);
    } catch (e) {
      console.error('[Share] Stats error:', e);
    }
  }

  function updatePreview() { loadStats(); }

  async function downloadCard() {
    try {
      var canvas = await GTA.ShareCard.generateCard();
      var filename = 'VaultGTA-' + new Date().toISOString().slice(0, 10) + '.png';
      var saved = await GTA.ShareCard.downloadNative(canvas, filename);
      if (saved) {
        GTA.Toast.success('分享卡片已保存！');
      } else if (saved === false) {
        // User cancelled
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
