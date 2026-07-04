/* ===== Event Bus (Pub/Sub) ===== */
window.GTA = window.GTA || {};

GTA.EventBus = (function () {
  const listeners = {};

  function on(event, callback) {
    if (!listeners[event]) {
      listeners[event] = [];
    }
    listeners[event].push(callback);
    // Return unsubscribe function
    return function () {
      off(event, callback);
    };
  }

  function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(function (cb) {
      return cb !== callback;
    });
  }

  function emit(event, payload) {
    if (!listeners[event]) return;
    listeners[event].forEach(function (cb) {
      try {
        cb(payload);
      } catch (e) {
        console.error('[EventBus] Error in listener for "' + event + '":', e);
      }
    });
  }

  /** Remove all listeners for an event (or all events) */
  function clear(event) {
    if (event) {
      delete listeners[event];
    } else {
      Object.keys(listeners).forEach(function (k) {
        delete listeners[k];
      });
    }
  }

  return { on, off, emit, clear };
})();
