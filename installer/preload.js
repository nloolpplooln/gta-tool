const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('installer', {
  selectDir: () => ipcRenderer.invoke('select-dir'),
  getDefaultDir: () => ipcRenderer.invoke('get-default-dir'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  install: (dir) => ipcRenderer.invoke('install', dir),
  launch: () => ipcRenderer.invoke('launch'),
  onProgress: (cb) => ipcRenderer.on('progress', (e, p) => cb(p)),
  close: () => ipcRenderer.send('close'),
  minimize: () => ipcRenderer.send('minimize')
});
