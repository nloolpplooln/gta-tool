/* ===== Supabase Configuration ===== */
window.GTA = window.GTA || {};

GTA.SupabaseConfig = (function () {
  var config = {
    url: 'https://dfchvbffwmuxvdwmqwwx.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2h2YmZmd211eHZkd21xd3d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDM0NzksImV4cCI6MjA5ODY3OTQ3OX0.ut2xMOFBu9VrZOVQgjTd-S_p6LY_h9Ue6R-azaWDjzg'
  };

  var client = null;

  function init() {
    if (client) return client;

    if (typeof window.supabase === 'undefined') {
      console.warn('[Supabase] SDK not loaded');
      return null;
    }

    client = window.supabase.createClient(config.url, config.key);
    GTA.log('[Supabase] Initialized');
    return client;
  }

  function getClient() {
    return client;
  }

  return { init: init, getClient: getClient, config: config };
})();
