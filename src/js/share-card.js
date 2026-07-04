/* ===== Share Card Generator (html2canvas) ===== */
window.GTA = window.GTA || {};

GTA.ShareCard = (function () {
  /**
   * Generate a PNG from the share card preview element
   * @returns {Promise<Blob>}
   */
  async function generateCard() {
    var element = document.getElementById('share-card-preview');
    if (!element) {
      throw new Error('Share card element not found');
    }

    var imgEl = element.querySelector('.share-card-bg-img');
    var originalSrc = imgEl ? imgEl.src : null;

    // Try to proxy the background image
    if (imgEl && originalSrc && !originalSrc.startsWith('data:')) {
      try {
        var base64 = await fetchProxyImage(originalSrc);
        if (base64) {
          imgEl.src = base64;
          await new Promise(function (resolve, reject) {
            imgEl.onload = resolve;
            imgEl.onerror = reject;
          });
        }
      } catch (e) {
        console.warn('[ShareCard] Proxy fallback, capturing without bg:', e.message);
      }
    }

    var canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#07070d',
      imageTimeout: 30000
    });

    // Restore original URL
    if (imgEl && originalSrc) {
      imgEl.src = originalSrc;
    }

    return canvas;
  }

  function fetchProxyImage(url) {
    return new Promise(function (resolve) {
      var proxyUrl = '/api/proxy-image?url=' + encodeURIComponent(url);
      var xhr = new XMLHttpRequest();
      xhr.open('GET', proxyUrl, true);
      xhr.responseType = 'blob';
      xhr.timeout = 15000;
      xhr.onload = function () {
        if (xhr.status === 200) {
          var reader = new FileReader();
          reader.onloadend = function () { resolve(reader.result); };
          reader.onerror = function () { resolve(null); };
          reader.readAsDataURL(xhr.response);
        } else {
          resolve(null);
        }
      };
      xhr.onerror = function () { resolve(null); };
      xhr.ontimeout = function () { resolve(null); };
      xhr.send();
    });
  }

  /**
   * Convert canvas to Blob (PNG)
   */
  function canvasToBlob(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      }, 'image/png');
    });
  }

  /**
   * Download the canvas via a temporary link
   */
  function downloadCanvas(canvas, filename) {
    var link = document.createElement('a');
    link.download = filename || 'share-card.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    return true;
  }

  /**
   * Try to save via native dialog (Electron IPC), fallback to browser download
   */
  async function downloadNative(canvas, filename) {
    try {
      var blob = await canvasToBlob(canvas);
      var buffer = await blob.arrayBuffer();
      var arr = new Uint8Array(buffer);
      // Try native save dialog via Electron
      if (window.electronAPI && window.electronAPI.saveFile) {
        var saved = await window.electronAPI.saveFile(Array.from(arr), filename);
        return saved;
      }
      // Fallback to browser download
      downloadCanvas(canvas, filename);
      return true;
    } catch (err) {
      console.error('[ShareCard] Download error:', err);
      // Final fallback
      downloadCanvas(canvas, filename);
      return true;
    }
  }

  /**
   * Populate share card stats
   */
  function populateCard(stats, playerName) {
    // Stats
    var shareOwned = document.getElementById('share-owned');
    var shareAssets = document.getElementById('share-assets');
    var shareDiscontinued = document.getElementById('share-discontinued');
    var shareGarages = document.getElementById('share-garages');
    var playerDisplay = document.getElementById('share-player-display');

    if (shareOwned) shareOwned.textContent = stats.ownedCount + '/' + stats.totalCount;
    if (shareAssets) shareAssets.textContent = GTA.Utils.formatCurrency(stats.totalValue);
    if (shareDiscontinued) shareDiscontinued.textContent = stats.discontinuedCount || 0;
    if (shareGarages) shareGarages.textContent = stats.garageCount || 0;
    if (playerDisplay) {
      playerDisplay.innerHTML = '玩家: <span>' + (playerName || '未设置') + '</span>';
    }
  }

  return {
    generateCard: generateCard,
    canvasToBlob: canvasToBlob,
    downloadCanvas: downloadCanvas,
    downloadNative: downloadNative,
    populateCard: populateCard
  };
})();
