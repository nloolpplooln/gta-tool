/* Tesseract CDN → Local Proxy Service Worker */

var CDN_BASE = 'cdn.jsdelivr.net';
var LOCAL_WORKER = '/vendor/worker.min.js';
var LOCAL_CORE = '/vendor/tesseract-core-simd-lstm.wasm.js';

// Map CDN path patterns to local files
function mapToLocal(url) {
  var u = new URL(url);
  if (u.hostname !== CDN_BASE) return null;

  if (u.pathname.indexOf('/npm/tesseract.js@') !== -1 && u.pathname.indexOf('/dist/worker') !== -1) {
    return LOCAL_WORKER;
  }
  if (u.pathname.indexOf('/npm/tesseract.js-core@') !== -1 && u.pathname.indexOf('wasm') !== -1) {
    return LOCAL_CORE;
  }
  if (u.pathname.indexOf('/npm/@tesseract.js-data/') !== -1) {
    // Extract language code and filename
    var parts = u.pathname.split('/');
    var langIdx = parts.indexOf('@tesseract.js-data') + 1;
    if (langIdx < parts.length) {
      var lang = parts[langIdx];
      var file = parts[parts.length - 1];
      return '/vendor/' + lang + '/4.0.0/' + file;
    }
    return '/vendor/eng/4.0.0/eng.traineddata.gz';
  }
  return null;
}

self.addEventListener('fetch', function(event) {
  var url = event.request.url;
  if (url.indexOf(CDN_BASE) === -1) return;

  var localUrl = mapToLocal(url);
  if (!localUrl) return;

  console.log('[SW] CDN → Local: ' + url.substring(0, 80) + ' → ' + localUrl);
  event.respondWith(fetch(localUrl));
});
