/* ===== Sidebar Navigation ===== */
window.GTA = window.GTA || {};

GTA.Navbar = (function () {
  function init() {
    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function (item) {
      item.addEventListener('click', function () {
        var page = this.getAttribute('data-nav');
        if (page) {
          GTA.Router.navigate(page);
        }
      });
    });

    // Listen to route changes to update active state
    GTA.EventBus.on('route:changed', function (data) {
      setActive(data.page);
    });

    // Update badge counts when vehicles change
    GTA.EventBus.on('vehicle:added', updateBadge);
    GTA.EventBus.on('vehicle:removed', updateBadge);
    GTA.EventBus.on('catalog:loaded', updateBadge);

    // Sync active state immediately (router already resolved before navbar init)
    var currentPage = GTA.Router.getCurrentPage();
    if (currentPage) {
      setActive(currentPage);
    }

    // Initialize window controls (Electron frameless)
    initWinControls();

    // Initialize user area
    initUserArea();
  }

  function initWinControls() {
    var api = window.electronAPI;
    if (!api) return; // Not in Electron

    var btnMin = document.getElementById('win-min');
    var btnMax = document.getElementById('win-max');
    var btnClose = document.getElementById('win-close');

    if (btnMin) btnMin.addEventListener('click', function () { api.minimizeWindow(); });
    if (btnClose) btnClose.addEventListener('click', function () { api.closeWindow(); });

    if (btnMax) {
      btnMax.addEventListener('click', function () { api.maximizeWindow(); });
      // Update maximize icon when window state changes
      window.addEventListener('resize', updateMaxBtn);
    }

    function updateMaxBtn() {
      if (!btnMax) return;
      api.isMaximized().then(function (maxed) {
        btnMax.innerHTML = maxed
          ? '<svg width="12" height="12" viewBox="0 0 12 12"><rect x="3.5" y="0.5" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="0.5" y="3.5" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>'
          : '<svg width="12" height="12" viewBox="0 0 12 12"><rect x="1.5" y="1.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
      });
    }
  }

  function showChangePasswordModal() {
    GTA.Modal.show({
      title: '修改密码',
      body:
        '<div class="form-group" style="margin-bottom:12px;">' +
          '<label class="form-label">当前密码</label>' +
          '<input type="password" class="form-input" id="mod-old-password" placeholder="输入当前密码">' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:12px;">' +
          '<label class="form-label">新密码</label>' +
          '<input type="password" class="form-input" id="mod-new-password" placeholder="至少 6 位">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">确认新密码</label>' +
          '<input type="password" class="form-input" id="mod-confirm-password" placeholder="再次输入新密码">' +
        '</div>',
      confirmText: '修改',
      cancelText: '取消',
      onConfirm: async function () {
        var oldPw = document.getElementById('mod-old-password');
        var newPw = document.getElementById('mod-new-password');
        var confirmPw = document.getElementById('mod-confirm-password');

        var old = oldPw ? oldPw.value : '';
        var neu = newPw ? newPw.value : '';
        var conf = confirmPw ? confirmPw.value : '';

        if (!old || !neu) { GTA.Toast.warning('请填写所有密码字段'); return false; }
        if (neu.length < 6) { GTA.Toast.warning('新密码至少 6 位'); return false; }
        if (neu !== conf) { GTA.Toast.warning('两次新密码不一致'); return false; }
        if (old === neu) { GTA.Toast.warning('新密码不能与当前密码相同'); return false; }

        try {
          await GTA.AuthService.changePassword(old, neu);
          GTA.Toast.success('密码已修改');
        } catch (e) {
          var msg = e.code === 'auth/wrong-password' ? '当前密码错误' : (e.message || '修改失败');
          GTA.Toast.error(msg);
          return false;
        }
      }
    });
  }

  function showChangeEmailModal() {
    var currentUser = GTA.AuthService.getUser();
    var currentEmail = currentUser ? currentUser.email : '';

    GTA.Modal.show({
      title: '更换邮箱',
      body:
        '<p style="color:var(--color-text-muted);margin-bottom:16px;">当前邮箱：<strong>' + (currentEmail || '未登录') + '</strong></p>' +
        '<div class="form-group" style="margin-bottom:12px;">' +
          '<label class="form-label">新邮箱</label>' +
          '<input type="email" class="form-input" id="mod-new-email" placeholder="new@email.com">' +
        '</div>' +
        '<p class="text-xs text-muted">确认后将发送验证邮件到新邮箱，点击验证后生效。</p>',
      confirmText: '发送验证',
      cancelText: '取消',
      onConfirm: async function () {
        var newEmail = (document.getElementById('mod-new-email') || {}).value;
        if (!newEmail || !newEmail.trim()) { GTA.Toast.warning('请输入新邮箱'); return false; }
        try {
          await GTA.AuthService.changeEmail(newEmail.trim());
          GTA.Modal.hide();
          GTA.Toast.success('验证邮件已发送，请检查新邮箱并点击确认链接');
        } catch (e) {
          GTA.Toast.error('更换失败：' + (e.message || '请重试'));
          return false;
        }
      }
    });
  }

  function showSetNewPasswordModal() {
    GTA.Modal.show({
      title: '设置新密码',
      body:
        '<p style="color:var(--color-text-muted);margin-bottom:16px;">请设置你的新密码。</p>' +
        '<div class="form-group" style="margin-bottom:12px;">' +
          '<label class="form-label">新密码</label>' +
          '<input type="password" class="form-input" id="mod-recovery-password" placeholder="至少 6 位">' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:12px;">' +
          '<label class="form-label">确认密码</label>' +
          '<input type="password" class="form-input" id="mod-recovery-confirm" placeholder="再次输入">' +
        '</div>',
      confirmText: '确认重置',
      cancelText: '取消',
      onConfirm: async function () {
        var pw = (document.getElementById('mod-recovery-password') || {}).value;
        var cf = (document.getElementById('mod-recovery-confirm') || {}).value;
        if (!pw || pw.length < 6) { GTA.Toast.warning('密码至少 6 位'); return false; }
        if (pw !== cf) { GTA.Toast.warning('两次密码不一致'); return false; }
        try {
          var sb = GTA.SupabaseConfig.getClient();
          var result = await sb.auth.updateUser({ password: pw });
          if (result.error) throw result.error;
          GTA.Toast.success('密码已重置');
        } catch (e) {
          GTA.Toast.error('设置失败：' + (e.message || '请重试'));
          return false;
        }
      }
    });
  }

  function closeSidebar() {
    // Mobile sidebar toggle removed — sidebar is always visible on desktop
  }

  function setActive(page) {
    var items = document.querySelectorAll('.nav-item');
    items.forEach(function (item) {
      item.classList.remove('active');
      if (item.getAttribute('data-nav') === page) {
        item.classList.add('active');
      }
    });
  }

  function initUserArea() {
    var userArea = document.getElementById('sidebar-user');
    var userMenu = document.getElementById('sidebar-user-menu');
    var logoutBtn = document.getElementById('user-menu-logout');
    var passwordBtn = document.getElementById('user-menu-password');
    var emailBtn = document.getElementById('user-menu-email');

    if (userArea) {
      userArea.addEventListener('click', function (e) {
        e.stopPropagation();
        if (GTA.AuthService.isLoggedIn()) {
          if (userMenu) userMenu.classList.toggle('open');
        } else {
          GTA.AuthModal.show();
        }
      });
    }

    // Close menu when clicking elsewhere
    document.addEventListener('click', function () {
      if (userMenu) userMenu.classList.remove('open');
    });

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async function (e) {
        e.stopPropagation();
        await GTA.AuthService.signOut();
        if (userMenu) userMenu.classList.remove('open');
        GTA.Toast.info('已退出登录');
      });
    }

    if (passwordBtn) {
      passwordBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (userMenu) userMenu.classList.remove('open');
        showChangePasswordModal();
      });
    }

    if (emailBtn) {
      emailBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (userMenu) userMenu.classList.remove('open');
        showChangeEmailModal();
      });
    }

    // Listen for auth state changes
    GTA.AuthService.onAuthChanged(function (user) {
      updateUserUI(user);
    });

    // Pre-populate from cache
    GTA.EventBus.on('auth:cached', function (cachedUser) {
      updateUserUIFromCache(cachedUser);
    });

    // Password recovery — user clicked reset link, prompt to set new password
    GTA.EventBus.on('auth:recovery', function (user) {
      showSetNewPasswordModal();
    });

    // Listen for Steam / R* profile detection
    GTA.EventBus.on('steam:detected', function (data) {
      updateSteamDisplay(data.displayName);
    });
    GTA.EventBus.on('steam:avatar', function (data) {
      updateSteamAvatar(data.dataUrl);
    });
    GTA.EventBus.on('rockstar:detected', function (data) {
      updateRstarAvatar(data.dataUrl);
    });

    // Load cached profile info
    loadCachedProfile();

    // Refresh when profile is pulled from cloud
    GTA.EventBus.on('profile:pulled', function (data) {
      if (data.steamDisplayName) { _steamDisplayName = data.steamDisplayName; refreshSidebarName(); }
      if (data.steamAvatar) { _steamAvatarDataUrl = data.steamAvatar; refreshSidebarAvatar(); }
      if (data.rstarAvatar) { _rstarAvatarDataUrl = data.rstarAvatar; refreshSidebarAvatar(); }
    });
  }

  function updateUserUI(user) {
    var userArea = document.getElementById('sidebar-user');
    var avatar = document.getElementById('sidebar-user-avatar');
    var nameEl = document.getElementById('sidebar-user-name');

    if (!userArea) return;

    if (user) {
      userArea.classList.add('logged-in');
      if (nameEl) nameEl.textContent = user.displayName || user.email || '玩家';
      if (avatar && user.photoURL) {
        avatar.innerHTML = '<img src="' + user.photoURL + '" alt="">';
      }
    } else {
      userArea.classList.remove('logged-in');
      if (nameEl) nameEl.textContent = '点击登录';
      if (avatar) {
        avatar.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
      }
      // Restore Steam/R* info after logout
      refreshSidebarName();
      refreshSidebarAvatar();
    }
  }

  function updateUserUIFromCache(cached) {
    var nameEl = document.getElementById('sidebar-user-name');
    if (nameEl && cached.displayName) {
      nameEl.textContent = cached.displayName;
    }
  }

  // ── Steam / Rockstar profile display ──

  var _steamDisplayName = '';
  var _steamAvatarDataUrl = '';
  var _rstarAvatarDataUrl = '';

  async function loadCachedProfile() {
    try {
      await GTA.db.ready();
      var steamName = await GTA.db.settings.get('steamDisplayName');
      if (steamName && steamName.value) {
        _steamDisplayName = steamName.value;
        refreshSidebarName();
      }
      var steamAv = await GTA.db.settings.get('steamAvatar');
      if (steamAv && steamAv.value) {
        _steamAvatarDataUrl = steamAv.value;
        refreshSidebarAvatar();
      }
      var avatar = await GTA.db.settings.get('rstarAvatar');
      if (avatar && avatar.value) {
        _rstarAvatarDataUrl = avatar.value;
        refreshSidebarAvatar();
      }
    } catch (e) { /* DB not ready yet */ }
  }

  function updateSteamDisplay(name) {
    _steamDisplayName = name;
    refreshSidebarName();
  }

  function updateSteamAvatar(dataUrl) {
    _steamAvatarDataUrl = dataUrl;
    refreshSidebarAvatar();
  }

  function updateRstarAvatar(dataUrl) {
    _rstarAvatarDataUrl = dataUrl;
    refreshSidebarAvatar();
  }

  /**
   * Show Steam name when not logged into Supabase.
   * When Supabase user is present, their name takes priority.
   */
  function refreshSidebarName() {
    // Update legacy user-area name
    var nameEl = document.getElementById('sidebar-user-name');
    if (!nameEl) return;
    var isLoggedIn = GTA.AuthService.isLoggedIn();
    if (!isLoggedIn && _steamDisplayName) {
      nameEl.textContent = _steamDisplayName;
    }

    // Update dedicated profile-info area (always visible when Steam detected)
    var profileInfo = document.getElementById('sidebar-profile-info');
    var profileName = document.getElementById('profile-info-name');
    if (profileInfo && profileName && _steamDisplayName) {
      profileInfo.style.display = 'flex';
      profileName.textContent = _steamDisplayName;
    } else if (profileInfo && !_steamDisplayName) {
      profileInfo.style.display = 'none';
    }
  }

  /**
   * Show R* avatar when no Supabase photo is set.
   */
  function refreshSidebarAvatar() {
    // User-area avatar: R* > Steam
    var userAvatar = _rstarAvatarDataUrl || _steamAvatarDataUrl;
    var avatar = document.getElementById('sidebar-user-avatar');
    if (avatar && userAvatar) {
      var user = GTA.AuthService.getCurrentUser ? GTA.AuthService.getCurrentUser() : null;
      if (!user || !user.photoURL) {
        avatar.innerHTML = '<img src="' + userAvatar + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
      }
    }

    // Profile-info avatar: Steam > R* (show Steam in the dedicated bar)
    var profileAvatar = document.getElementById('profile-info-avatar');
    var profileAv = _steamAvatarDataUrl || _rstarAvatarDataUrl;
    var profileInfo = document.getElementById('sidebar-profile-info');
    if (profileAvatar && profileAv) {
      profileAvatar.innerHTML = '<img src="' + profileAv + '" alt="">';
      if (profileInfo) profileInfo.style.display = 'flex';
    }
    if (profileInfo && _steamDisplayName) {
      profileInfo.style.display = 'flex';
    }
  }

  async function updateBadge() {
    try {
      await GTA.db.ready();
      var count = await GTA.db.ownedVehicles.count();
      var badge = document.getElementById('nav-owned-count');
      if (badge) badge.textContent = count;
      var sidebarStats = document.getElementById('sidebar-stats');
      if (sidebarStats) sidebarStats.textContent = '数据: ' + count + ' 辆';
    } catch (e) {
      // DB not ready yet
    }
  }

  return { init: init, setActive: setActive, updateBadge: updateBadge };
})();
