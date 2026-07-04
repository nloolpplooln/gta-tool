const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 720, height: 480,
    frame: false,
    resizable: false,
    backgroundColor: '#0b0b0b',
    webPreferences: {
      preload: path.join(__dirname, 'installer', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.center();
  win.loadFile(path.join(__dirname, 'installer', 'index.html'));
}

ipcMain.handle('select-dir', async () => {
  const r = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    title: 'Select Installation Folder'
  });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('get-default-dir', () => {
  return path.join(process.env.LOCALAPPDATA || app.getPath('home'), 'VaultGTA');
});

ipcMain.handle('get-version', () => '10.26.1');

ipcMain.handle('install', async (event, installDir) => {
  const srcDir = path.join(__dirname, 'dist', 'win-unpacked');
  if (!fs.existsSync(srcDir)) {
    return { success: false, error: 'Application files not found: ' + srcDir };
  }
  try {
    fs.mkdirSync(installDir, { recursive: true });
    const files = walkDir(srcDir);
    for (let i = 0; i < files.length; i++) {
      const rel = files[i];
      const src = path.join(srcDir, rel);
      const dst = path.join(installDir, rel);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
      win.webContents.send('progress', Math.round((i + 1) / files.length * 100));
    }
    // Create desktop shortcut
    try {
      const { execSync } = require('child_process');
      const shortcut = path.join(app.getPath('desktop'), 'VaultGTA.lnk');
      const target = path.join(installDir, 'VaultGTA.exe');
      execSync('powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut(\'' + shortcut.replace(/'/g, "''") + '\');$s.TargetPath=\'' + target.replace(/'/g, "''") + '\';$s.Save()"');
    } catch (e) {}
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('launch', async () => {
  app.quit();
});

ipcMain.on('close', () => app.quit());
ipcMain.on('minimize', () => win.minimize());

function walkDir(dir, base) {
  if (!base) base = dir;
  const results = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) results.push(...walkDir(full, base));
    else results.push(path.relative(base, full));
  }
  return results;
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
