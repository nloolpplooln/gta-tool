/* ===== Supabase Auth Service ===== */
window.GTA = window.GTA || {};

GTA.AuthService = (function () {
  var sb = null;
  var currentUser = null;
  var listeners = [];
  var PAGES_URL = 'https://nloolpplooln.github.io/vaultgta-auth/index.html';
  var RESET_REDIRECT = PAGES_URL;
  var LINK_REDIRECT = PAGES_URL;

  // Map Supabase user to format the app expects
  function normalizeUser(user) {
    if (!user) return null;
    return {
      uid: user.id,
      email: user.email,
      displayName: user.user_metadata ? user.user_metadata.display_name || '' : '',
      // Keep raw user for API calls
      _raw: user
    };
  }

  function init() {
    sb = GTA.SupabaseConfig.init();
    if (!sb) {
      console.warn('[Auth] Supabase unavailable, auth disabled');
      return;
    }

    // Listen for auth state changes
    sb.auth.onAuthStateChange(function (event, session) {
      var raw = session ? session.user : null;
      var normalized = normalizeUser(raw);
      currentUser = normalized;
      if (normalized) {
        localStorage.setItem('gta_user', JSON.stringify({
          uid: normalized.uid,
          email: normalized.email,
          displayName: normalized.displayName
        }));
      } else {
        localStorage.removeItem('gta_user');
      }
      listeners.forEach(function (fn) { fn(normalized); });
      GTA.EventBus.emit('auth:changed', normalized);

      // Detect password recovery — prompt user to set new password
      if (event === 'PASSWORD_RECOVERY') {
        GTA.EventBus.emit('auth:recovery', normalized);
      }
    });

    // Immediately check for existing session (app restart)
    sb.auth.getSession().then(function (result) {
      if (result.data && result.data.session) {
        var raw = result.data.session.user;
        var normalized = normalizeUser(raw);
        currentUser = normalized;
        GTA.EventBus.emit('auth:changed', normalized);
      }
    }).catch(function () {});

    // Restore from localStorage for fast initial render
    var cached = localStorage.getItem('gta_user');
    if (cached) {
      try {
        var cachedUser = JSON.parse(cached);
        GTA.EventBus.emit('auth:cached', cachedUser);
      } catch (e) {}
    }

    // Handle magic-link protocol URL (vaultgta://auth#access_token=...&refresh_token=...)
    var api = window.electronAPI;
    if (api) {
      // Cold start: app was launched via protocol link
      api.getProtocolUrl().then(function (url) {
        if (url) handleProtocolUrl(url);
      }).catch(function () {});
      // Warm start: app already running, received protocol link
      api.onProtocolUrl(function (url) { handleProtocolUrl(url); });
    }
  }

  function handleProtocolUrl(url) {
    try {
      // Support both hash and query param formats
      var params;
      if (url.indexOf('?') !== -1) {
        params = new URLSearchParams(url.split('?')[1]);
      } else if (url.indexOf('#') !== -1) {
        params = new URLSearchParams(url.split('#')[1]);
      } else {
        return;
      }
      var accessToken = params.get('access_token');
      var refreshToken = params.get('refresh_token');
      if (!accessToken || !refreshToken) return;
      sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(function (r) {
          if (!r.error) {
            // onAuthStateChange will fire and update the UI
            GTA.log('[Auth] Magic-link login success');
          }
        })
        .catch(function (e) {
          console.error('[Auth] Magic-link session error:', e);
        });
    } catch (e) {
      console.error('[Auth] Protocol URL parse error:', e);
    }
  }

  async function signUp(email, password, displayName) {
    var result = await sb.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { display_name: displayName }
      }
    });
    if (result.error) throw result.error;
    return result.data.user;
  }

  async function signIn(email, password) {
    var result = await sb.auth.signInWithPassword({
      email: email,
      password: password
    });
    if (result.error) throw result.error;
    return result.data.user;
  }

  /**
   * GitHub OAuth login — opens browser, user authorizes, redirected back to app.
   */
  async function signInWithGitHub() {
    var result = await sb.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: LINK_REDIRECT,
        skipBrowserRedirect: true  // Don't redirect the Electron window
      }
    });
    if (result.error) throw result.error;
    // Returns a URL — open in default browser
    return result.data.url;
  }

  /**
   * Poll for magic-link tokens stored on server (cross-device login).
   * Returns tokens if found, null if timed out.
   */
  async function pollForTokens(email, timeoutMs) {
    timeoutMs = timeoutMs || 300000; // 5 minutes
    var interval = 3000; // poll every 3 seconds
    var start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        var result = await sb.from('auth_tokens')
          .select('token_data')
          .eq('email', email)
          .single();
        if (result.data && result.data.token_data) {
          // Delete the token record immediately
          await sb.from('auth_tokens').delete().eq('email', email);
          return result.data.token_data;
        }
      } catch (e) { /* no token yet */ }
      await new Promise(function (resolve) { setTimeout(resolve, interval); });
    }
    return null;
  }

  async function signOut() {
    await sb.auth.signOut();
  }

  /**
   * Parse a Supabase auth URL and extract tokens + type.
   * URL format: https://xxx.supabase.co/auth/v1/verify?token=xxx&type=recovery|magiclink...
   */
  function parseAuthUrl(url) {
    try {
      var u = new URL(url);
      var token = u.searchParams.get('token');
      var type = u.searchParams.get('type');
      var hash = url.split('#')[1];
      var accessToken = null;
      var refreshToken = null;
      if (hash) {
        var hp = new URLSearchParams(hash);
        accessToken = hp.get('access_token');
        refreshToken = hp.get('refresh_token');
      }
      return { token: token, type: type, accessToken: accessToken, refreshToken: refreshToken };
    } catch (e) {
      return null;
    }
  }

  /**
   * Use a pasted magic-link / recovery URL to sign in.
   * Works cross-device: receive email on phone, paste link on PC.
   */
  async function signInFromPastedUrl(url) {
    var parsed = parseAuthUrl(url);
    if (!parsed) throw new Error('链接格式无效');

    if (parsed.accessToken && parsed.refreshToken) {
      // URL already contains tokens (from redirect)
      var r = await sb.auth.setSession({ access_token: parsed.accessToken, refresh_token: parsed.refreshToken });
      if (r.error) throw r.error;
    } else if (parsed.token) {
      // Exchange verify token for session via Supabase API
      var verifyUrl = 'https://dfchvbffwmuxvdwmqwwx.supabase.co/auth/v1/verify';
      var resp = await fetch(verifyUrl + '?token=' + encodeURIComponent(parsed.token) + '&type=' + (parsed.type || 'magiclink') + '&redirect_to=' + encodeURIComponent('vaultgta://auth?done=1'));
      // The response will be a 302 redirect - we just need the token to be verified
      // After verification, Supabase creates the session server-side
      // For magic link, the user is now logged in via the token verification
      if (resp.status >= 400) throw new Error('验证失败，链接可能已过期');
      // Poll for session - the auth state should update shortly
      await new Promise(function (resolve) { setTimeout(resolve, 1000); });
      var userResult = await sb.auth.getUser();
      if (!userResult.data.user) throw new Error('登录失败，请重试');
    } else {
      throw new Error('链接格式无效');
    }
  }

  /**
   * Use a pasted password-reset URL to set a new password.
   */
  async function resetPasswordFromPastedUrl(url, newPassword) {
    var parsed = parseAuthUrl(url);
    if (!parsed) throw new Error('链接格式无效');

    if (parsed.accessToken && parsed.refreshToken) {
      var r = await sb.auth.setSession({ access_token: parsed.accessToken, refresh_token: parsed.refreshToken });
      if (r.error) throw r.error;
    } else if (parsed.token) {
      // Exchange verify token
      var verifyUrl = 'https://dfchvbffwmuxvdwmqwwx.supabase.co/auth/v1/verify';
      var resp = await fetch(verifyUrl + '?token=' + encodeURIComponent(parsed.token) + '&type=' + (parsed.type || 'recovery') + '&redirect_to=' + encodeURIComponent('vaultgta://auth?done=1'));
      await new Promise(function (resolve) { setTimeout(resolve, 1000); });
      var userResult = await sb.auth.getUser();
      if (!userResult.data.user) throw new Error('验证失败，链接可能已过期');
    } else {
      throw new Error('链接格式无效');
    }

    // Now authenticated with recovery session, set new password
    var updateResult = await sb.auth.updateUser({ password: newPassword });
    if (updateResult.error) throw updateResult.error;
  }

  /**
   * Magic link — send a login link to email
   */
  async function signInWithOtp(email) {
    var result = await sb.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: LINK_REDIRECT,
        shouldCreateUser: false
      }
    });
    if (result.error) throw result.error;
  }

  /**
   * Change account email — sends confirmation to new email
   */
  async function changeEmail(newEmail) {
    var result = await sb.auth.updateUser({
      email: newEmail
    });
    if (result.error) throw result.error;
    currentUser = normalizeUser(result.data.user);
    localStorage.setItem('gta_user', JSON.stringify({
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName
    }));
  }

  function getUser() {
    return currentUser;
  }

  function isLoggedIn() {
    return !!currentUser;
  }

  async function changePassword(currentPassword, newPassword) {
    if (!currentUser || !currentUser.email) throw new Error('未登录');

    // Verify current password by attempting sign-in
    var check = await sb.auth.signInWithPassword({
      email: currentUser.email,
      password: currentPassword
    });
    if (check.error) throw new Error('当前密码错误');

    // Update password
    var result = await sb.auth.updateUser({ password: newPassword });
    if (result.error) throw result.error;
  }

  async function sendPasswordResetEmail(email) {
    var result = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_REDIRECT
    });
    if (result.error) throw result.error;
  }

  async function updateDisplayName(displayName) {
    var result = await sb.auth.updateUser({
      data: { display_name: displayName }
    });
    if (result.error) throw result.error;
    // Re-normalize and cache
    currentUser = normalizeUser(result.data.user);
    localStorage.setItem('gta_user', JSON.stringify({
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName
    }));
  }

  function onAuthChanged(fn) {
    listeners.push(fn);
    if (currentUser !== undefined) {
      fn(currentUser);
    }
  }

  return {
    init: init,
    signUp: signUp,
    signIn: signIn,
    signInWithOtp: signInWithOtp,
    pollForTokens: pollForTokens,
    signInWithGitHub: signInWithGitHub,
    signInFromPastedUrl: signInFromPastedUrl,
    resetPasswordFromPastedUrl: resetPasswordFromPastedUrl,
    changeEmail: changeEmail,
    signOut: signOut,
    changePassword: changePassword,
    sendPasswordResetEmail: sendPasswordResetEmail,
    updateDisplayName: updateDisplayName,
    getUser: getUser,
    isLoggedIn: isLoggedIn,
    onAuthChanged: onAuthChanged
  };
})();
