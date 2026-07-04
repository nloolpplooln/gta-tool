/* ===== Toast Notification System ===== */
window.GTA = window.GTA || {};

GTA.Toast = (function () {
  var container = null;
  var DEFAULT_DURATION = 3000;

  function init() {
    container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText =
        'position:fixed;top:16px;right:16px;z-index:300;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(container);
    }
  }

  /**
   * Show a toast notification
   * @param {string} message - Text to display
   * @param {string} type - 'success' | 'error' | 'warning' | 'info'
   * @param {number} duration - Auto-dismiss after ms (0 = no auto-dismiss)
   */
  function show(message, type, duration) {
    if (!container) init();

    if (!duration && duration !== 0) duration = DEFAULT_DURATION;
    if (!type) type = 'info';

    var colors = {
      success: { bg: 'rgba(46,204,113,0.85)', border: '#2ecc71' },
      error: { bg: 'rgba(231,76,60,0.85)', border: '#e74c3c' },
      warning: { bg: 'rgba(243,156,18,0.85)', border: '#f39c12' },
      info: { bg: 'rgba(52,152,219,0.85)', border: '#3498db' }
    };
    var color = colors[type] || colors.info;

    var icons = {
      success: GTA.Icons.check,
      error: GTA.Icons.close,
      warning: GTA.Icons.warning,
      info: GTA.Icons.info
    };

    var toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.style.cssText =
      'background:' + color.bg + ';' +
      'border:1px solid ' + color.border + ';' +
      'color:#fff;padding:10px 16px;border-radius:8px;' +
      'font-size:13px;font-weight:500;' +
      'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);' +
      'box-shadow:0 4px 12px rgba(0,0,0,0.3);' +
      'display:flex;align-items:center;gap:8px;' +
      'min-width:240px;max-width:380px;' +
      'animation:toastIn 300ms var(--ease-out);' +
      'cursor:pointer;';
    toast.innerHTML = '<span class="toast-icon" style="display:flex;align-items:center;flex-shrink:0;">' + (icons[type] || '') + '</span><span>' + message + '</span>';

    toast.addEventListener('click', function () {
      dismiss(toast);
    });

    container.appendChild(toast);

    if (duration > 0) {
      setTimeout(function () {
        dismiss(toast);
      }, duration);
    }

    return toast;
  }

  function dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    toast.style.animation = 'toastOut 200ms var(--ease-in-out)';
    toast.addEventListener('animationend', function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
  }

  function success(message) { return show(message, 'success'); }
  function error(message) { return show(message, 'error'); }
  function warning(message) { return show(message, 'warning'); }
  function info(message) { return show(message, 'info'); }

  return { show: show, success: success, error: error, warning: warning, info: info };
})();
