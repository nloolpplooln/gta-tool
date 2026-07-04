const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_NAME = 'VaultGTA';
const APP_EXE = 'VaultGTA.exe';

let win;
let lastInstallDir = '';

function createShortcut(scPath, targetExe, workingDir) {
  const sc = 'Set s=WScript.CreateObject("WScript.Shell").CreateShortcut("' +
    scPath.replace(/\\/g, '\\\\') + '")\n' +
    's.TargetPath="' + targetExe.replace(/\\/g, '\\\\') + '"\n' +
    's.WorkingDirectory="' + workingDir.replace(/\\/g, '\\\\') + '"\n' +
    's.Description="VaultGTA - GTA Vehicle Tracker"\n' +
    's.Save()\n';
  return sc;
}

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 720, height: 500, frame: false, resizable: false,
    backgroundColor: '#0b0b0b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false
    }
  });
  win.center();
  win.loadFile(path.join(__dirname, 'index.html'));

  // Find the bundled main app
  let srcDir = path.join(__dirname, 'app');
  if (!fs.existsSync(path.join(srcDir, APP_EXE))) {
    srcDir = path.join(process.resourcesPath, 'app', 'app');
  }
  // Write debug to desktop so we can verify
  try {
    const debugPath = path.join(app.getPath('desktop'), 'vaultgta_debug.txt');
    const list = fs.existsSync(srcDir) ? fs.readdirSync(srcDir).slice(0,30).join('\n') : 'DIR NOT FOUND';
    fs.writeFileSync(debugPath, '__dirname=' + __dirname +
      '\nresourcesPath=' + process.resourcesPath +
      '\nsrcDir=' + srcDir +
      '\nexists=' + fs.existsSync(srcDir) +
      '\nhasExe=' + fs.existsSync(path.join(srcDir, APP_EXE)) +
      '\n\nFiles in srcDir:\n' + list);
  } catch(e) {}

  ipcMain.handle('select-dir', async () => {
    const r = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'], title: 'Choose Install Location'
    });
    return r.canceled ? null : r.filePaths[0];
  });

  ipcMain.handle('get-default-dir', () => {
    return path.join(process.env.LOCALAPPDATA || app.getPath('home'), APP_NAME);
  });

  ipcMain.handle('get-version', () => '10.26.1');

  ipcMain.on('close', () => app.quit());
  ipcMain.on('minimize', () => win.minimize());

  ipcMain.handle('install', async (event, installDir) => {
    // Write immediately to confirm handler was called
    try { fs.writeFileSync(path.join(app.getPath('desktop'), 'vaultgta_install_log.txt'), 'Install started\nsrcDir=' + srcDir + '\ntarget=' + installDir); } catch(e) {}

    lastInstallDir = installDir;
    const debugLog = ['Install started', 'srcDir=' + srcDir, 'target=' + installDir];
    try {
      // Manual recursive copy (fs.cpSync may crash on large dirs with asar files)
      function copyDir(src, dst) {
        if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const e of entries) {
          const s = path.join(src, e.name);
          const d = path.join(dst, e.name);
          if (e.isDirectory()) {
            copyDir(s, d);
          } else {
            try { fs.copyFileSync(s, d); } catch(err) { debugLog.push('SKIP: ' + e.name); }
          }
        }
      }
      copyDir(srcDir, installDir);

      debugLog.push('Copy done');
      debugLog.push('Target has exe: ' + fs.existsSync(path.join(installDir, APP_EXE)));

      // Shortcuts
      try {
        const targetExe = path.join(installDir, APP_EXE);
        const desktopSC = path.join(app.getPath('desktop'), APP_NAME + '.lnk');
        const startDir = path.join(app.getPath('appData'), 'Microsoft\\Windows\\Start Menu\\Programs', APP_NAME);
        if (!fs.existsSync(startDir)) fs.mkdirSync(startDir, { recursive: true });
        const startSC = path.join(startDir, APP_NAME + '.lnk');
        const vbs = createShortcut(desktopSC, targetExe, installDir) + createShortcut(startSC, targetExe, installDir);
        const vbsFile = path.join(installDir, '_sc.vbs');
        fs.writeFileSync(vbsFile, vbs);
        require('child_process').execSync('cscript //Nologo "' + vbsFile + '"', { windowsHide: true, timeout: 5000 });
        try { fs.unlinkSync(vbsFile); } catch(e) {}
        debugLog.push('Shortcuts created');
      } catch(e) { debugLog.push('Shortcut error: ' + e.message); }

      try {
        fs.writeFileSync(path.join(app.getPath('desktop'), 'vaultgta_install_log.txt'), debugLog.join('\n'));
      } catch(e) {}

      return { success: true, installDir: installDir };
    } catch (e) {
      try {
        fs.writeFileSync(path.join(app.getPath('desktop'), 'vaultgta_install_log.txt'), 'FATAL: ' + e.message + '\n' + (e.stack || ''));
      } catch(e2) {}
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('launch', () => {
    const exe = path.join(lastInstallDir, APP_EXE);
    try {
      if (fs.existsSync(exe)) {
        require('child_process').spawn(exe, [], { detached: true, stdio: 'ignore', cwd: lastInstallDir }).unref();
      }
    } catch(e) {
      // Fallback: open the install folder
      shell.openPath(lastInstallDir);
    }
    app.quit();
  });
});

app.on('window-all-closed', () => app.quit());
