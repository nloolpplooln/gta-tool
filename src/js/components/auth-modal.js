/* ===== Auth Modal (Login / Register) ===== */
window.GTA = window.GTA || {};

GTA.AuthModal = (function () {
  var overlay = null;
  var box = null;
  var visible = false;

  function init() {
    overlay = document.getElementById('auth-modal-overlay');
    box = document.getElementById('auth-modal-box');

    if (!overlay) {
      // Create overlay
      overlay = document.createElement('div');
      overlay.id = 'auth-modal-overlay';
      overlay.className = 'auth-modal-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:250;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;';
      document.body.appendChild(overlay);
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hide();
    });

    // ESC to close
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && visible) hide();
    });
  }

  function show() {
    if (!overlay) init();

    var tab = 'login'; // default tab

    render(tab);
    overlay.style.display = 'flex';
    visible = true;
  }

  function hide() {
    if (overlay) {
      overlay.style.display = 'none';
      overlay.innerHTML = '';
    }
    visible = false;
  }

  function render(tab) {
    var isReset = tab === 'reset';
    var isMagic = tab === 'magic';
    var isPwd = tab === 'login' || tab === 'register';

    overlay.innerHTML =
      '<div class="auth-modal-box glass-card animate-scale-in" id="auth-modal-box" style="width:400px;max-width:90vw;padding:32px;position:relative;">' +
        '<button class="auth-modal-close" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--color-text-muted);cursor:pointer;font-size:20px;">×</button>' +
        '<h2 style="text-align:center;margin-bottom:24px;font-size:var(--font-size-xl);">' +
          (isReset ? '重置密码' : isMagic ? '免密登录' : (tab === 'login' ? '登录' : '注册')) +
        '</h2>' +
        (isReset ? '' :
        '<div class="tabs" style="margin-bottom:24px;">' +
          '<div class="tab' + (tab === 'login' ? ' active' : '') + '" id="auth-tab-login">登录</div>' +
          '<div class="tab' + (tab === 'register' ? ' active' : '') + '" id="auth-tab-register">注册</div>' +
          '<div class="tab' + (tab === 'magic' ? ' active' : '') + '" id="auth-tab-magic" style="font-size:11px;">免密</div>' +
        '</div>') +
        // Form
        '<div class="form-group" style="margin-bottom:12px;">' +
          '<label class="form-label">邮箱</label>' +
          '<input type="email" class="form-input" id="auth-email" placeholder="your@email.com">' +
        '</div>' +
        (isPwd
          ? '<div class="form-group" style="margin-bottom:12px;">' +
              '<label class="form-label">密码</label>' +
              '<input type="password" class="form-input" id="auth-password" placeholder="至少 6 位">' +
            '</div>'
          : '') +
        (tab === 'register'
          ? '<div class="form-group" style="margin-bottom:16px;">' +
              '<label class="form-label">显示名称</label>' +
              '<input type="text" class="form-input" id="auth-displayname" placeholder="你的玩家名">' +
            '</div>'
          : '') +
        '<div id="auth-error" style="color:var(--color-danger);font-size:var(--font-size-xs);margin-bottom:12px;display:none;"></div>' +
        '<div id="auth-success" style="color:var(--color-success);font-size:var(--font-size-xs);margin-bottom:12px;display:none;"></div>' +
        '<button class="btn btn-primary" id="auth-submit" style="width:100%;margin-top:8px;">' +
          (isReset ? '发送重置邮件' : isMagic ? '发送登录链接' : (tab === 'login' ? '登录' : '注册')) +
        '</button>' +
        (isReset
          ? '<p class="auth-switch-text" style="text-align:center;margin-top:16px;font-size:var(--font-size-xs);color:var(--color-text-muted);cursor:pointer;">← 返回登录</p>'
          : '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;">' +
              '<p class="auth-switch-text" style="font-size:var(--font-size-xs);color:var(--color-text-muted);cursor:pointer;margin:0;">' +
                (tab === 'login' ? '还没有账号？去注册' : tab === 'register' ? '已有账号？去登录' : '使用密码登录') +
              '</p>' +
              (tab === 'login'
                ? '<span id="auth-forgot" style="font-size:var(--font-size-xs);color:var(--color-gold);cursor:pointer;">忘记密码？</span>'
                : '') +
            '</div>') +
        // GitHub OAuth button
        (tab === 'login' || tab === 'register'
          ? '<div style="margin-top:16px;padding-top:16px;border-top:1px solid #1e1e3a;text-align:center;">' +
              '<button id="auth-github" style="width:100%;padding:10px;background:#24292e;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">' +
                '<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>' +
                'GitHub 登录' +
              '</button>' +
            '</div>'
          : '') +
      '</div>';

    // Bind events
    var closeBtn = overlay.querySelector('.auth-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', hide);

    if (!isReset) {
      var tabLogin = overlay.querySelector('#auth-tab-login');
      var tabRegister = overlay.querySelector('#auth-tab-register');
      var tabMagic = overlay.querySelector('#auth-tab-magic');
      if (tabLogin) tabLogin.addEventListener('click', function () { render('login'); });
      if (tabRegister) tabRegister.addEventListener('click', function () { render('register'); });
      if (tabMagic) tabMagic.addEventListener('click', function () { render('magic'); });
    }

    // Switch tab text
    var switchText = overlay.querySelector('.auth-switch-text');
    if (switchText) {
      switchText.addEventListener('click', function () {
        if (isReset) { render('login'); }
        else if (isMagic) { render('login'); }
        else { render(tab === 'login' ? 'register' : 'login'); }
      });
    }

    // Forgot password link
    var forgotLink = overlay.querySelector('#auth-forgot');
    if (forgotLink) {
      forgotLink.addEventListener('click', function () { render('reset'); });
    }

    // GitHub login button
    var githubBtn = overlay.querySelector('#auth-github');
    if (githubBtn) {
      githubBtn.addEventListener('click', async function () {
        githubBtn.disabled = true;
        githubBtn.textContent = '正在跳转浏览器...';
        try {
          var url = await GTA.AuthService.signInWithGitHub();
          hide();
          GTA.Toast.info('请在浏览器中完成 GitHub 授权，完成后软件将自动登录');
          var api = window.electronAPI;
          if (api && api.openExternal) {
            await api.openExternal(url);
          } else {
            window.open(url, '_blank');
          }
        } catch (e) {
          GTA.Toast.error('GitHub 登录失败：' + (e.message || '请重试'));
          githubBtn.disabled = false;
          githubBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>GitHub 登录';
        }
      });
    }

    var submitBtn = overlay.querySelector('#auth-submit');
    if (submitBtn) {
      submitBtn.addEventListener('click', function () { handleSubmit(tab); });
    }

    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handleSubmit(tab);
    });
  }

  async function handleSubmit(tab) {
    var emailEl = overlay.querySelector('#auth-email');
    var passEl = overlay.querySelector('#auth-password');
    var nameEl = overlay.querySelector('#auth-displayname');
    var errEl = overlay.querySelector('#auth-error');
    var succEl = overlay.querySelector('#auth-success');
    var btn = overlay.querySelector('#auth-submit');

    var email = emailEl ? emailEl.value.trim() : '';
    var password = passEl ? passEl.value : '';

    if (errEl) errEl.style.display = 'none';
    if (succEl) succEl.style.display = 'none';

    if (!email) {
      showError('请填写邮箱');
      return;
    }

    // Magic link flow — send email, poll for cross-device login
    if (tab === 'magic') {
      if (btn) { btn.disabled = true; btn.textContent = '发送中...'; }
      try {
        await GTA.AuthService.signInWithOtp(email);
        if (succEl) {
          succEl.textContent = '链接已发送。在任意设备打开邮箱，点击链接即可登录。';
          succEl.style.display = 'block';
        }
        if (btn) { btn.disabled = false; btn.textContent = '发送登录链接'; }
        // Start polling for tokens (cross-device)
        pollAndLogin(email, errEl);
      } catch (e) {
        showError(mapError(e));
        if (btn) { btn.disabled = false; btn.textContent = '发送登录链接'; }
      }
      return;
    }

    // Password reset flow — send email, user clicks link to set new password
    if (tab === 'reset') {
      if (btn) { btn.disabled = true; btn.textContent = '发送中...'; }
      try {
        await GTA.AuthService.sendPasswordResetEmail(email);
        if (succEl) {
          succEl.textContent = '重置邮件已发送。请打开邮箱点击链接设置新密码，完成后返回软件登录。';
          succEl.style.display = 'block';
        }
        if (btn) { btn.disabled = false; btn.textContent = '发送重置邮件'; }
      } catch (e) {
        showError(mapError(e));
        if (btn) { btn.disabled = false; btn.textContent = '发送重置邮件'; }
      }
      return;
    }

    if (!password) {
      showError('请填写密码');
      return;
    }
    if (password.length < 6) {
      showError('密码至少 6 位');
      return;
    }
    if (tab === 'register' && !(nameEl ? nameEl.value.trim() : '')) {
      showError('请填写显示名称');
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '处理中...'; }

    try {
      if (tab === 'register') {
        var displayName = nameEl ? nameEl.value.trim() : '';
        await GTA.AuthService.signUp(email, password, displayName);
        GTA.Toast.success('注册成功！欢迎 ' + displayName);
      } else {
        await GTA.AuthService.signIn(email, password);
        GTA.Toast.success('登录成功！');
      }
      hide();
    } catch (e) {
      showError(mapError(e));
      if (btn) { btn.disabled = false; btn.textContent = tab === 'login' ? '登录' : '注册'; }
    }
  }

  /**
   * Step 2: show paste field for verification link.
   * Works cross-device — receive email on phone, copy link, paste on PC.
   */
  function renderPasteStep(type, email) {
    var isMagic = type === 'magic';

    overlay.innerHTML =
      '<div class="auth-modal-box glass-card animate-scale-in" style="width:400px;max-width:90vw;padding:32px;position:relative;">' +
        '<button class="auth-modal-close" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--color-text-muted);cursor:pointer;font-size:20px;">×</button>' +
        '<h2 style="text-align:center;margin-bottom:8px;font-size:var(--font-size-xl);">' +
          (isMagic ? '免密登录' : '重置密码') +
        '</h2>' +
        '<p style="color:var(--color-success);font-size:var(--font-size-xs);text-align:center;margin-bottom:12px;">邮件已发送至 ' + (email || '') + '</p>' +
        '<p style="color:var(--color-text-muted);font-size:var(--font-size-xs);text-align:center;line-height:1.6;margin-bottom:12px;">' +
          '<strong>方法一：</strong>在电脑上打开邮件，点击链接自动登录<br>' +
          '<strong>方法二：</strong>手机收到邮件 → 复制链接 → 粘贴到下方' +
        '</p>' +
        '<div class="form-group" style="margin-bottom:12px;">' +
          '<textarea class="form-input" id="paste-link" placeholder="粘贴邮件中的完整链接..." style="width:100%;height:60px;resize:vertical;font-size:11px;"></textarea>' +
        '</div>' +
        (isMagic
          ? ''
          : '<div class="form-group" style="margin-bottom:12px;">' +
              '<label class="form-label">新密码</label>' +
              '<input type="password" class="form-input" id="paste-password" placeholder="至少 6 位">' +
            '</div>') +
        '<div id="paste-error" style="color:var(--color-danger);font-size:var(--font-size-xs);margin-bottom:12px;display:none;"></div>' +
        '<button class="btn btn-primary" id="btn-paste-submit" style="width:100%;">' +
          (isMagic ? '验证并登录' : '验证并重置密码') +
        '</button>' +
        '<p class="auth-switch-text" style="text-align:center;margin-top:16px;font-size:var(--font-size-xs);color:var(--color-text-muted);cursor:pointer;">← 返回</p>' +
      '</div>';

    var closeBtn = overlay.querySelector('.auth-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', hide);

    var backBtn = overlay.querySelector('.auth-switch-text');
    if (backBtn) backBtn.addEventListener('click', function () { render('login'); });

    var submitBtn = overlay.querySelector('#btn-paste-submit');
    if (submitBtn) {
      submitBtn.addEventListener('click', function () { handlePasteSubmit(type); });
    }

    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handlePasteSubmit(type);
    });
  }

  async function handlePasteSubmit(type) {
    var urlEl = overlay.querySelector('#paste-link');
    var pwEl = overlay.querySelector('#paste-password');
    var errEl = overlay.querySelector('#paste-error');
    var btn = overlay.querySelector('#btn-paste-submit');

    var url = urlEl ? urlEl.value.trim() : '';
    if (!url) {
      if (errEl) { errEl.textContent = '请粘贴邮件中的链接'; errEl.style.display = 'block'; }
      return;
    }

    if (errEl) errEl.style.display = 'none';
    if (btn) { btn.disabled = true; btn.textContent = '验证中...'; }

    try {
      if (type === 'magic') {
        await GTA.AuthService.signInFromPastedUrl(url);
        GTA.Toast.success('登录成功！');
        hide();
      } else {
        var pw = pwEl ? pwEl.value : '';
        if (!pw || pw.length < 6) {
          if (errEl) { errEl.textContent = '密码至少 6 位'; errEl.style.display = 'block'; }
          if (btn) { btn.disabled = false; btn.textContent = '验证并重置密码'; }
          return;
        }
        await GTA.AuthService.resetPasswordFromPastedUrl(url, pw);
        GTA.Toast.success('密码已重置，请用新密码登录');
        hide();
      }
    } catch (e) {
      if (errEl) {
        var msg = e.message || '验证失败';
        if (msg.indexOf('expired') !== -1) msg = '链接已过期，请重新发送';
        errEl.textContent = msg;
        errEl.style.display = 'block';
      }
      if (btn) { btn.disabled = false; btn.textContent = type === 'magic' ? '验证并登录' : '验证并重置密码'; }
    }
  }

  async function pollAndLogin(email, errEl) {
    GTA.Toast.info('请打开邮箱，点击链接完成验证。软件将自动检测登录。');
    var tokens = await GTA.AuthService.pollForTokens(email);
    if (tokens && tokens.access_token) {
      var sb = GTA.SupabaseConfig.getClient();
      if (sb) {
        var r = await sb.auth.setSession({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
        if (!r.error) {
          GTA.Toast.success('登录成功！');
          hide();
          return;
        }
      }
    }
    hide();
    GTA.Toast.warning('未检测到登录，请检查是否点击了邮件中的链接，然后重新打开软件。');
  }

  function showError(msg) {
    var errEl = overlay.querySelector('#auth-error');
    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = 'block';
    }
  }

  function mapError(e) {
    var code = e.code || '';
    if (code.indexOf('invalid-email') !== -1) return '邮箱格式不正确';
    if (code.indexOf('user-not-found') !== -1) return '账号不存在';
    if (code.indexOf('wrong-password') !== -1) return '密码错误';
    if (code.indexOf('email-already-in-use') !== -1) return '此邮箱已注册';
    if (code.indexOf('weak-password') !== -1) return '密码太弱，至少 6 位';
    if (code.indexOf('too-many-requests') !== -1) return '操作太频繁，请稍后再试';
    return e.message || '操作失败，请重试';
  }

  return { show: show, hide: hide };
})();
