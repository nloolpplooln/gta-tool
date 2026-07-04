/* ===== OCR Engine (Tesseract.js Wrapper) ===== */
window.GTA = window.GTA || {};

GTA.OCR = (function () {
  var worker = null;
  var initialized = false;

  async function initWorker() {
    if (initialized && worker) return worker;
    try {
      GTA.log('[OCR] Creating worker...');
      // Local vendor files — bypass CDN (Service Worker can't intercept Worker importScripts)
      // chi_sim+eng — Chinese for CJK text, English for vehicle codes/digits.
      worker = await Tesseract.createWorker('chi_sim+eng', 1, {
        workerPath: '/vendor/worker.min.js',
        corePath: '/vendor/',
        langPath: '/vendor/',
        workerBlobURL: false,
        gzip: true,
        logger: function (info) {
          if (info.status === 'recognizing text') {
            GTA.EventBus.emit('ocr:progress', {
              progress: Math.round(info.progress * 100),
              status: 'recognizing'
            });
          }
        }
      });
      initialized = true;
      GTA.log('[OCR] Worker ready');
      return worker;
    } catch (err) {
      console.error('[OCR] Init error:', err);
      worker = null;
      initialized = false;
      throw err;
    }
  }

  async function recognize(image, onProgress) {
    await initWorker();
    if (onProgress) onProgress(5);

    // Render image to canvas
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var img = new Image();
    var src = typeof image === 'string' ? image : URL.createObjectURL(image);
    img.src = src;
    try { await img.decode(); } catch (e) {
      await new Promise(function(resolve, reject) { img.onload = resolve; img.onerror = reject; });
    }
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    if (typeof image !== 'string') URL.revokeObjectURL(src);

    // Grayscale
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var data = imageData.data;
    for (var i = 0; i < data.length; i += 4) {
      var gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = data[i + 1] = data[i + 2] = gray;
    }
    ctx.putImageData(imageData, 0, 0);
    if (onProgress) onProgress(10);

    // Two OCR passes: PSM 3 (layout-aware) + PSM 11 (sparse, catches what PSM 3 misses)
    // Merging both ensures consistent coverage across different image layouts.
    var entries = [];
    var covered = {};

    function collectFromResult(r) {
      // Full text output (reading order, most reliable)
      if (r.data && r.data.text) {
        r.data.text.split('\n').forEach(function(t, idx) {
          t = t.trim();
          if (t.length >= 2 && !covered[t]) {
            covered[t] = true;
            entries.push({ text: t, conf: r.data.confidence || 40, y0: idx });
          }
        });
      }
      // Words — short Latin codes that text output might have missed
      if (r.data && r.data.words) {
        r.data.words.forEach(function(w) {
          var t = w.text.trim();
          if (t && t.length >= 2 && !covered[t]) {
            covered[t] = true;
            entries.push({ text: t, conf: w.confidence, y0: w.bbox ? w.bbox.y0 : 99999 });
          }
        });
      }
    }

    try {
      var r3 = await worker.recognize(canvas, { tessedit_pageseg_mode: '3' });
      collectFromResult(r3);
    } catch (err) { console.error('[OCR] PSM 3 error:', err); }

    try {
      var r11 = await worker.recognize(canvas, { tessedit_pageseg_mode: '11' });
      collectFromResult(r11);
    } catch (err) { console.error('[OCR] PSM 11 error:', err); }

    if (onProgress) onProgress(90);

    // Sort: text entries (from \n order) first, then word entries by y0
    entries.sort(function(a, b) { return a.y0 - b.y0; });

    // Remove entries that are substrings of another entry (PSM 11 captures
    // short codes like "SJ" separately from "羽黑SJ"). Only applies to pure
    // Latin/digit entries — CJK entries are never substrings to delete.
    var lines = [];
    var isCJK = /[一-鿿]/;
    entries.forEach(function(e) {
      if (!isCJK.test(e.text)) {
        for (var k = 0; k < entries.length; k++) {
          if (entries[k] === e) continue;
          if (entries[k].text.indexOf(e.text) !== -1) { return; }
        }
      }
      lines.push({ text: e.text, confidence: e.conf, bbox: null });
    });

    // Remove spaces within CJK and between CJK↔Latin
    var cjkGap = /([一-鿿])\s+([一-鿿])/;
    var cjkLatinGap = /([一-鿿])\s+([A-Za-z0-9])/g;
    var latinCjkGap = /([A-Za-z0-9])\s+([一-鿿])/g;
    for (var i = 0; i < lines.length; i++) {
      lines[i].text = lines[i].text.replace(cjkLatinGap, '$1$2');
      lines[i].text = lines[i].text.replace(latinCjkGap, '$1$2');
      var prev = '';
      while (prev !== lines[i].text) {
        prev = lines[i].text;
        lines[i].text = lines[i].text.replace(cjkGap, '$1$2');
      }
      lines[i].text = lines[i].text.trim();
    }

    if (onProgress) onProgress(100);
    return lines;
  }

  async function terminate() {
    if (worker) { await worker.terminate(); worker = null; initialized = false; }
  }

  return { initWorker: initWorker, recognize: recognize, terminate: terminate };
})();
