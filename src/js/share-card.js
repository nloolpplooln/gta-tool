/* ===== Share Card Generator (html2canvas) ===== */
window.GTA = window.GTA || {};

GTA.ShareCard = (function () {

  async function generateCard() {
    var element = document.getElementById('share-card-preview');
    if (!element) throw new Error('Share card element not found');

    var imgEl = element.querySelector('.share-card-bg-img');
    var originalSrc = imgEl ? imgEl.src : null;

    // Proxy background image for cross-origin capture
    if (imgEl && originalSrc && !originalSrc.startsWith('data:')) {
      try {
        var base64 = await fetchProxyImage(originalSrc);
        if (base64) {
          imgEl.src = base64;
          await new Promise(function (resolve, reject) {
            imgEl.onload = resolve; imgEl.onerror = reject;
          });
        }
      } catch (e) {
        console.warn('[ShareCard] Proxy fallback:', e.message);
      }
    }

    // Enter download mode — hide controls
    document.body.classList.add('share-downloading');

    var canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#0E0E0E',
      imageTimeout: 30000
    });

    // Restore
    document.body.classList.remove('share-downloading');
    if (imgEl && originalSrc) { imgEl.src = originalSrc; }

    return canvas;
  }

  function fetchProxyImage(url) {
    return new Promise(function (resolve) {
      var proxyUrl = '/api/proxy-image?url=' + encodeURIComponent(url);
      var xhr = new XMLHttpRequest();
      xhr.open('GET', proxyUrl, true);
      xhr.responseType = 'blob'; xhr.timeout = 15000;
      xhr.onload = function () {
        if (xhr.status === 200) {
          var reader = new FileReader();
          reader.onloadend = function () { resolve(reader.result); };
          reader.onerror = function () { resolve(null); };
          reader.readAsDataURL(xhr.response);
        } else { resolve(null); }
      };
      xhr.onerror = function () { resolve(null); };
      xhr.ontimeout = function () { resolve(null); };
      xhr.send();
    });
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        blob ? resolve(blob) : reject(new Error('Blob failed'));
      }, 'image/png');
    });
  }

  function downloadCanvas(canvas, filename) {
    var a = document.createElement('a');
    a.download = filename || 'share-card.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
    return true;
  }

  async function downloadNative(canvas, filename) {
    try {
      var blob = await canvasToBlob(canvas);
      var buffer = await blob.arrayBuffer();
      var arr = new Uint8Array(buffer);
      if (window.electronAPI && window.electronAPI.saveFile) {
        return await window.electronAPI.saveFile(Array.from(arr), filename);
      }
      downloadCanvas(canvas, filename);
      return true;
    } catch (err) {
      console.error('[ShareCard] Download error:', err);
      downloadCanvas(canvas, filename);
      return true;
    }
  }

  function populateCard(stats, playerName) {
    var owned = document.getElementById('share-owned');
    var progressPct = document.getElementById('share-progress-pct');
    var assets = document.getElementById('share-assets');
    var discontinued = document.getElementById('share-discontinued');
    var playerDisplay = document.getElementById('share-player-display');
    var progressFill = document.getElementById('share-progress-fill');
    var progressText = document.getElementById('share-progress-text');

    var collectedPct = stats.totalCount > 0
      ? Math.round((stats.ownedCount / stats.totalCount) * 1000) / 10
      : 0;

    if (owned) owned.textContent = stats.ownedCount;
    if (progressPct) progressPct.textContent = collectedPct + '%';
    if (assets) assets.textContent = GTA.Utils.formatCurrency(stats.totalValue);
    if (discontinued) discontinued.textContent = stats.discontinuedCount || 0;
    if (playerDisplay) playerDisplay.textContent = playerName || '—';
    if (progressFill) progressFill.style.width = collectedPct + '%';
    if (progressText) progressText.textContent = collectedPct + '% Complete';
  }

  return {
    generateCard: generateCard,
    canvasToBlob: canvasToBlob,
    downloadCanvas: downloadCanvas,
    downloadNative: downloadNative,
    populateCard: populateCard
  };
})();
