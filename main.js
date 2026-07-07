const { app, BrowserWindow, ipcMain, dialog, Menu, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { autoUpdater } = require('electron-updater');
const SteamProfile = require('./src/main/steam-profile');
const RockstarProfile = require('./src/main/rockstar-profile');

let mainWindow = null;
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
      env: Object.assign({}, process.env, { ELECTRON_RUN: '1', USER_DATA: app.getPath('userData') })
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

// ===== Custom Background Video =====

const BG_VIDEO_DIR = path.join(app.getPath('userData'), 'bg-video');
const BG_VIDEO_FILE = 'custom-bg';

// Select a video file and copy to userData/bg-video/
ipcMain.handle('bg:selectVideo', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择背景视频',
    filters: [
      { name: '视频文件', extensions: ['mp4', 'webm', 'mov', 'mkv', 'avi'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || !result.filePaths.length) return null;

  const srcPath = result.filePaths[0];
  const ext = path.extname(srcPath);
  const destPath = path.join(BG_VIDEO_DIR, BG_VIDEO_FILE + ext);

  if (!fs.existsSync(BG_VIDEO_DIR)) fs.mkdirSync(BG_VIDEO_DIR, { recursive: true });

  // Remove any existing custom video
  try {
    const existing = fs.readdirSync(BG_VIDEO_DIR).filter(f => f.startsWith(BG_VIDEO_FILE));
    for (const f of existing) {
      fs.unlinkSync(path.join(BG_VIDEO_DIR, f));
    }
  } catch (e) { /* ignore */ }

  fs.copyFileSync(srcPath, destPath);
  return '/assets/video/' + BG_VIDEO_FILE + ext;
});

// Get current background video URL
ipcMain.handle('bg:getVideoPath', async () => {
  try {
    const files = fs.readdirSync(BG_VIDEO_DIR).filter(f => f.startsWith(BG_VIDEO_FILE));
    if (!files.length) return null;
    return '/assets/video/' + files[0];
  } catch (e) { return null; }
});

// Remove custom background video
ipcMain.handle('bg:removeVideo', async () => {
  try {
    const files = fs.readdirSync(BG_VIDEO_DIR).filter(f => f.startsWith(BG_VIDEO_FILE));
    for (const f of files) {
      fs.unlinkSync(path.join(BG_VIDEO_DIR, f));
    }
  } catch (e) { /* ignore */ }
});

// ===== Custom Background Image =====

const BG_IMG_DIR = path.join(app.getPath('userData'), 'bg-image');
const BG_IMG_FILE = 'custom-bg-img';

ipcMain.handle('bg:selectImage', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择背景图片',
    filters: [{ name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths.length) return null;

  const srcPath = result.filePaths[0];
  const ext = path.extname(srcPath);
  const destPath = path.join(BG_IMG_DIR, BG_IMG_FILE + ext);

  if (!fs.existsSync(BG_IMG_DIR)) fs.mkdirSync(BG_IMG_DIR, { recursive: true });

  try {
    const existing = fs.readdirSync(BG_IMG_DIR).filter(f => f.startsWith(BG_IMG_FILE));
    for (const f of existing) fs.unlinkSync(path.join(BG_IMG_DIR, f));
  } catch (e) { /* ignore */ }

  // Also clear video to avoid conflict
  try {
    const videoFiles = fs.readdirSync(BG_VIDEO_DIR).filter(f => f.startsWith(BG_VIDEO_FILE));
    for (const f of videoFiles) fs.unlinkSync(path.join(BG_VIDEO_DIR, f));
  } catch (e) { /* ignore */ }

  fs.copyFileSync(srcPath, destPath);
  return '/assets/bg-img/' + BG_IMG_FILE + ext;
});

ipcMain.handle('bg:getImagePath', async () => {
  try {
    const files = fs.readdirSync(BG_IMG_DIR).filter(f => f.startsWith(BG_IMG_FILE));
    if (!files.length) return null;
    return '/assets/bg-img/' + files[0];
  } catch (e) { return null; }
});

ipcMain.handle('bg:removeImage', async () => {
  try {
    const files = fs.readdirSync(BG_IMG_DIR).filter(f => f.startsWith(BG_IMG_FILE));
    for (const f of files) fs.unlinkSync(path.join(BG_IMG_DIR, f));
  } catch (e) { /* ignore */ }
});

// ===== Preset Backgrounds =====

ipcMain.handle('bg:setPreset', async (_event, presetId) => {
  // Clear both video and image custom backgrounds
  try {
    const vFiles = fs.readdirSync(BG_VIDEO_DIR).filter(f => f.startsWith(BG_VIDEO_FILE));
    for (const f of vFiles) fs.unlinkSync(path.join(BG_VIDEO_DIR, f));
  } catch (e) {}
  try {
    const iFiles = fs.readdirSync(BG_IMG_DIR).filter(f => f.startsWith(BG_IMG_FILE));
    for (const f of iFiles) fs.unlinkSync(path.join(BG_IMG_DIR, f));
  } catch (e) {}
  return presetId;
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

// Download update (triggered after user sees "available" notification)
ipcMain.handle('app:downloadUpdate', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return true;
  } catch (e) {
    console.error('[Updater] Download failed:', e.message);
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
