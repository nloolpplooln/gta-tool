const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls (frameless)
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Open native image file picker
  openImageDialog: () => ipcRenderer.invoke('dialog:openImage'),

  // Save file via native save dialog (for share card PNG)
  saveFile: (buffer, defaultName) => ipcRenderer.invoke('dialog:saveFile', buffer, defaultName),

  // Get app data path
  getAppPath: () => ipcRenderer.invoke('app:getPath'),

  // ===== Custom Background Video =====
  selectBackgroundVideo: () => ipcRenderer.invoke('bg:selectVideo'),
  getBackgroundVideoPath: () => ipcRenderer.invoke('bg:getVideoPath'),
  removeBackgroundVideo: () => ipcRenderer.invoke('bg:removeVideo'),

  // ===== Custom Background Image =====
  selectBackgroundImage: () => ipcRenderer.invoke('bg:selectImage'),
  getBackgroundImagePath: () => ipcRenderer.invoke('bg:getImagePath'),
  removeBackgroundImage: () => ipcRenderer.invoke('bg:removeImage'),
  setPresetBackground: (presetId) => ipcRenderer.invoke('bg:setPreset', presetId),

  // ===== Steam / Rockstar Profile Detection =====
  getSteamDisplayName: () => ipcRenderer.invoke('steam:getDisplayName'),
  getSteamAvatar: () => ipcRenderer.invoke('steam:getAvatar'),
  getRockstarAvatar: () => ipcRenderer.invoke('rockstar:getAvatar'),

  // ===== Protocol URL (magic-link login) =====
  getProtocolUrl: function () { return ipcRenderer.invoke('auth:getProtocolUrl'); },
  onProtocolUrl: function (cb) { ipcRenderer.on('auth:protocol-url', function (_e, url) { cb(url); }); },

  // ===== Open URL in default browser =====
  openExternal: function (url) { return ipcRenderer.invoke('app:openExternal', url); },

  // ===== Auto Updater =====
  checkUpdate: function () { return ipcRenderer.invoke('app:checkUpdate'); },
  installUpdate: function () { return ipcRenderer.invoke('app:installUpdate'); },
  getVersion: function () { return ipcRenderer.invoke('app:getVersion'); },
  onUpdateStatus: function (cb) { ipcRenderer.on('update:status', function (_e, data) { cb(data); }); }
});
