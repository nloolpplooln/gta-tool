/* ===== Modal Dialog ===== */
window.GTA = window.GTA || {};

GTA.Modal = (function () {
  var overlay = null;
  var box = null;
  var titleEl = null;
  var bodyEl = null;
  var footerEl = null;
  var closeBtn = null;
  var onConfirmFn = null;
  var onCancelFn = null;
  var visible = false;

  function init() {
    overlay = document.getElementById('modal-overlay');
    box = document.getElementById('modal-box');
    titleEl = document.getElementById('modal-title');
    bodyEl = document.getElementById('modal-body');
    footerEl = document.getElementById('modal-footer');
    closeBtn = document.getElementById('modal-close');

    if (!overlay) return;

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        hide(false);
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        hide(false);
      });
    }

    // ESC key to close
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && visible) {
        hide(false);
      }
    });
  }

  /**
   * Show modal
   * @param {Object} opts - { title, body (HTML string), confirmText, cancelText, onConfirm, onCancel, showCancel }
   */
  function show(opts) {
    if (!overlay) init();
    if (!overlay) return;

    if (!opts) opts = {};

    if (titleEl) titleEl.textContent = opts.title || '';
    if (bodyEl) bodyEl.innerHTML = opts.body || '';

    onConfirmFn = opts.onConfirm || null;
    onCancelFn = opts.onCancel || null;

    // Build footer buttons
    if (footerEl) {
      footerEl.innerHTML = '';

      if (opts.showCancel !== false) {
        var cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = opts.cancelText || '取消';
        cancelBtn.addEventListener('click', function () { hide(false); });
        footerEl.appendChild(cancelBtn);
      }

      var confirmBtn = document.createElement('button');
      confirmBtn.className = 'btn btn-primary';
      confirmBtn.textContent = opts.confirmText || '确认';
      confirmBtn.addEventListener('click', async function () {
        if (onConfirmFn) {
          try {
            var result = await onConfirmFn();
            if (result === false) return; // Validation failed, don't close
          } catch (e) {
            console.error('[Modal] onConfirm error:', e);
          }
        }
        hide(true);
      });
      footerEl.appendChild(confirmBtn);
    }

    overlay.classList.remove('d-none');
    overlay.style.display = 'flex';
    box.classList.add('animate-scale-in');
    visible = true;

    if (opts.onShow) {
      setTimeout(function () { opts.onShow(); }, 50);
    }
  }

  function hide(confirmed) {
    if (!overlay) return;
    overlay.classList.add('d-none');
    overlay.style.display = 'none';
    visible = false;

    if (!confirmed && onCancelFn) {
      onCancelFn();
    }

    onConfirmFn = null;
    onCancelFn = null;
  }

  function isVisible() {
    return visible;
  }

  // Auto-init on load
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('DOMContentLoaded', init);
  }

  return { show: show, hide: hide, isVisible: isVisible };
})();
