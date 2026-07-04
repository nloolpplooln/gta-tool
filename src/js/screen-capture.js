/* ===== Screen Capture & Keyboard IPC Wrapper ===== */
window.GTA = window.GTA || {};

GTA.ScreenCapture = (function () {
  /**
   * Check if Electron IPC is available (works in Electron, not browser)
   */
  function isAvailable() {
    return !!(window.electronAPI && window.electronAPI.captureScreen);
  }

  /**
   * Open the transparent overlay window
   */
  async function openOverlay() {
    if (!isAvailable()) {
      GTA.Toast.warning('此功能仅在 Electron 桌面应用中可用');
      return false;
    }
    try {
      return await window.electronAPI.openOverlay();
    } catch (e) {
      console.error('[ScreenCapture] Open overlay error:', e);
      return false;
    }
  }

  /**
   * Close the overlay window
   */
  async function closeOverlay() {
    if (!isAvailable()) return false;
    try {
      return await window.electronAPI.closeOverlay();
    } catch (e) {
      return false;
    }
  }

  /**
   * Get overlay bounds
   */
  async function getBounds() {
    if (!isAvailable()) return null;
    return await window.electronAPI.getOverlayBounds();
  }

  /**
   * Capture the screen region under the overlay
   * Returns base64 PNG data URL (cropped to overlay bounds)
   */
  async function capture() {
    if (!isAvailable()) {
      throw new Error('Screen capture not available');
    }
    var result = await window.electronAPI.captureScreen();
    if (!result) {
      throw new Error('Capture failed — make sure overlay is open');
    }

    // Crop using browser Canvas
    return new Promise(function (resolve, reject) {
      var fullImg = new Image();
      fullImg.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = result.cropW;
        canvas.height = result.cropH;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(fullImg, result.cropX, result.cropY, result.cropW, result.cropH, 0, 0, result.cropW, result.cropH);
        resolve(canvas.toDataURL('image/png'));
      };
      fullImg.onerror = function () {
        reject(new Error('Failed to load full screen image'));
      };
      fullImg.src = result.dataUrl;
    });
  }

  /**
   * Send keyboard key(s) to the system
   * @param {string} key - 'DOWN' | 'UP' | 'ENTER' | 'ESC'
   * @param {number} count - number of presses
   */
  async function sendKey(key, count) {
    if (!isAvailable()) {
      console.warn('[ScreenCapture] Keyboard not available');
      return;
    }
    await window.electronAPI.sendKey(key, count || 1);
  }

  /**
   * Scroll down by pressing DOWN key N times
   */
  async function scrollDown(lines) {
    await sendKey('DOWN', lines || 1);
  }

  return {
    isAvailable: isAvailable,
    openOverlay: openOverlay,
    closeOverlay: closeOverlay,
    getBounds: getBounds,
    capture: capture,
    sendKey: sendKey,
    scrollDown: scrollDown
  };
})();
