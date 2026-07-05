const { app, BrowserWindow, ipcMain, dialog, desktopCapturer, screen, Menu, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { autoUpdater } = require('electron-updater');
const SteamProfile = require('./src/main/steam-profile');
const RockstarProfile = require('./src/main/rockstar-profile');

let mainWindow = null;
let overlayWindow = null;
let serverProcess = null;

const PORT = 3000;
const APP_URL = 'http://localhost:' + PORT + '/src/html/index.html';

// --- Single instance lock: prevent multiple app windows ---
var gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', function (_event, commandLine) {
    // User clicked magic-link while app is already running
    var url = commandLine.find(function (arg) { return arg.startsWith('vaultgta://'); });
    if (url && mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.webContents.send('auth:protocol-url', url);
    }
  });
}

// Register custom protocol for magic-link login
// When user clicks vaultgta:// link, it opens this app
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('vaultgta', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('vaultgta');
}

// Handle protocol URL (cold start & macOS)
var protocolUrl = null;
app.on('open-url', function (event, url) {
  event.preventDefault();
  protocolUrl = url;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('auth:protocol-url', url);
  }
});

// Remove default menu bar entirely
try {
  Menu.setApplicationMenu(null);
} catch (e) {
  // Fallback for older/newer Electron API
  if (Menu && Menu.buildFromTemplate) {
    Menu.setApplicationMenu(Menu.buildFromTemplate([]));
  }
}

// --- Setup Wizard (auto-detected on first run, or with --setup flag) ---
const isSetup = process.argv.includes('--setup');
let isFirstRun = false;
try { isFirstRun = !fs.existsSync(path.join(app.getPath('userData'), '.setup-complete')); } catch(e) {}

if (isSetup || isFirstRun) {
  app.whenReady().then(() => {
    const setupWin = new BrowserWindow({
      width: 660, height: 460, frame: false, resizable: false,
      backgroundColor: '#0b0b0b',
      webPreferences: {
        preload: path.join(__dirname, 'installer', 'setup-preload.js'),
        contextIsolation: true, nodeIntegration: false
      }
    });
    setupWin.center();
    setupWin.loadFile(path.join(__dirname, 'installer', 'setup.html'));
    ipcMain.on('setup:done', () => {
      try { fs.writeFileSync(path.join(app.getPath('userData'), '.setup-complete'), 'done'); } catch(e) {}
      setupWin.close();
      createWindow();
    });
    ipcMain.on('setup:close', () => app.quit());
  });
  app.on('window-all-closed', () => { app.quit(); });
  return;
}

function startServer() {
  return new Promise(function (resolve, reject) {
    // Start the Node.js HTTP server as a child process
    var serverPath = path.join(__dirname, 'server.js');
    serverProcess = require('child_process').fork(serverPath, [], {
      silent: true,
      env: Object.assign({}, process.env, { ELECTRON_RUN: '1' })
    });
    serverProcess.stdout.on('data', function (data) {
      var msg = data.toString();
      if (msg.indexOf('VaultGTA') !== -1) {
        console.log('[Main] Server started on port', PORT);
        // Give server a moment to fully start
        setTimeout(resolve, 500);
      }
    });
    serverProcess.stderr.on('data', function (data) {
      console.error('[Server]', data.toString());
    });
    serverProcess.on('error', reject);
    // Timeout fallback
    setTimeout(resolve, 3000);
  });
}

async function createWindow() {
  // Start the HTTP server first
  try {
    await startServer();
  } catch (e) {
    console.error('[Main] Server start failed:', e);
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 800,
    maxWidth: 1280,
    maxHeight: 800,
    title: 'VaultGTA',
    backgroundColor: '#0B0B0B',
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      enableWebSQL: false
    }
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ===== Open URL in default browser =====
ipcMain.handle('app:openExternal', function (_event, url) {
  return shell.openExternal(url);
});

// ===== Protocol URL (magic-link login) =====
ipcMain.handle('auth:getProtocolUrl', function () {
  var url = protocolUrl;
  protocolUrl = null;
  return url;
});

// ===== Window Controls =====

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});
ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});
ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});
ipcMain.handle('window:isMaximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// ===== IPC Handlers =====

// Open image file dialog
ipcMain.handle('dialog:openImage', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择图片',
    properties: ['openFile'],
    filters: [
      { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }
    ]
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// Save file dialog (for share card)
ipcMain.handle('dialog:saveFile', async (_event, buffer, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '保存分享卡片',
    defaultPath: defaultName || 'share-card.png',
    filters: [
      { name: 'PNG 图片', extensions: ['png'] }
    ]
  });
  if (result.canceled) return false;
  fs.writeFileSync(result.filePath, Buffer.from(buffer));
  return true;
});

// Get app data path
ipcMain.handle('app:getPath', () => {
  return app.getPath('userData');
});

// ===== Overlay Window =====

ipcMain.handle('overlay:open', async () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.focus();
    return true;
  }
  overlayWindow = new BrowserWindow({
    width: 400,
    height: 500,
    x: 100,
    y: 100,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  overlayWindow.loadFile(path.join(__dirname, 'garage-scanner-overlay.html'));
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true);
  return true;
});

ipcMain.handle('overlay:close', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
  }
  overlayWindow = null;
  return true;
});

ipcMain.handle('overlay:getBounds', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow.getBounds();
  }
  return null;
});

// ===== Screen Capture =====

ipcMain.handle('capture:screen', async () => {
  if (!overlayWindow || overlayWindow.isDestroyed()) return null;
  try {
    const bounds = overlayWindow.getBounds();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    // Get full screen thumbnail
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height }
    });

    if (!sources.length) return null;

    var img = sources[0].thumbnail;
    var imgSize = img.getSize();
    var scaleX = imgSize.width / width;
    var scaleY = imgSize.height / height;

    // Return full PNG + crop rect — cropping done in renderer via browser Canvas
    return {
      dataUrl: img.toDataURL(),
      imgWidth: imgSize.width,
      imgHeight: imgSize.height,
      cropX: Math.round(bounds.x * scaleX),
      cropY: Math.round(bounds.y * scaleY),
      cropW: Math.round(bounds.width * scaleX),
      cropH: Math.round(bounds.height * scaleY)
    };
  } catch (e) {
    console.error('[Capture] Error:', e);
    return null;
  }
});

// ===== Keyboard Simulation (Windows PowerShell SendKeys) =====

ipcMain.handle('key:send', async (_event, key, count) => {
  return new Promise((resolve) => {
    const cnt = count || 1;
    const keyMap = { DOWN: 'DOWN', UP: 'UP', LEFT: 'LEFT', RIGHT: 'RIGHT', ENTER: 'ENTER', TAB: 'TAB', ESC: 'ESC' };
    const vk = keyMap[key] || key;
    const cmd = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $w = New-Object -ComObject wscript.shell; for($i=0; $i -lt ${cnt}; $i++) { [System.Windows.Forms.SendKeys]::SendWait('{${vk}}'); Start-Sleep -Milliseconds 120 }"`;
    exec(cmd, (err) => {
      if (err) console.error('[SendKeys] Error:', err.message);
      resolve(true);
    });
  });
});

// ===== Steam / Rockstar Profile Detection =====

ipcMain.handle('steam:getDisplayName', async () => {
  return await SteamProfile.getSteamDisplayName();
});

ipcMain.handle('steam:getAvatar', async () => {
  return await SteamProfile.getSteamAvatar();
});

ipcMain.handle('rockstar:getAvatar', async () => {
  return await RockstarProfile.getRockstarAvatar();
});

// ===== Auto Updater =====

// Configure autoUpdater to check GitHub Releases
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'nloolpplooln',
  repo: 'gta-tool'
});
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('checking-for-update', () => {
  console.log('[Updater] Checking for updates...');
  mainWindow && mainWindow.webContents.send('update:status', { status: 'checking', message: '正在检查更新...' });
});

autoUpdater.on('update-available', (info) => {
  console.log('[Updater] Update available:', info.version);
  mainWindow && mainWindow.webContents.send('update:status', { status: 'available', message: '发现新版本 v' + info.version, version: info.version });
});

autoUpdater.on('update-not-available', () => {
  console.log('[Updater] Already up to date');
  mainWindow && mainWindow.webContents.send('update:status', { status: 'latest', message: '已是最新版本' });
});

autoUpdater.on('download-progress', (progress) => {
  var pct = Math.round(progress.percent);
  mainWindow && mainWindow.webContents.send('update:status', { status: 'downloading', message: '下载中 ' + pct + '%', percent: pct });
});

autoUpdater.on('update-downloaded', () => {
  console.log('[Updater] Update downloaded, ready to install');
  mainWindow && mainWindow.webContents.send('update:status', { status: 'downloaded', message: '更新已下载，点击重启安装' });
});

autoUpdater.on('error', (err) => {
  console.error('[Updater] Error:', err.message);
  mainWindow && mainWindow.webContents.send('update:status', { status: 'error', message: '更新出错: ' + err.message });
});

// Manual check for updates (triggered from settings page)
ipcMain.handle('app:checkUpdate', async () => {
  try {
    await autoUpdater.checkForUpdates();
    return true;
  } catch (e) {
    console.error('[Updater] Check failed:', e.message);
    return false;
  }
});

// Install update and restart
ipcMain.handle('app:installUpdate', () => {
  autoUpdater.quitAndInstall();
});

// Get current app version
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

// ===== App Lifecycle =====

app.whenReady().then(() => {
  createWindow();
  // Auto-check for updates after app starts (silent, only notifies if update available)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 5000);
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) serverProcess.kill();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
