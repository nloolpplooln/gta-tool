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

  // ===== Garage Scanner Overlay =====

  // Open the transparent overlay window
  openOverlay: () => ipcRenderer.invoke('overlay:open'),

  // Close the overlay window
  closeOverlay: () => ipcRenderer.invoke('overlay:close'),

  // Get overlay window bounds (x, y, width, height)
  getOverlayBounds: () => ipcRenderer.invoke('overlay:getBounds'),

  // ===== Screen Capture =====

  // Capture the screen region under the overlay window
  // Returns a base64 PNG data URL
  captureScreen: () => ipcRenderer.invoke('capture:screen'),

  // ===== Keyboard Simulation =====

  // Send keyboard key(s) to the system (for game automation)
  // key: 'DOWN' | 'UP' | 'ENTER' | etc.
  // count: number of times to press
  sendKey: (key, count) => ipcRenderer.invoke('key:send', key, count || 1),

  // ===== Steam / Rockstar Profile Detection =====

  // Auto-detect Steam display name from Steam client
  getSteamDisplayName: () => ipcRenderer.invoke('steam:getDisplayName'),

  // Auto-detect Steam avatar from local cache
  getSteamAvatar: () => ipcRenderer.invoke('steam:getAvatar'),

  // Auto-detect Rockstar Social Club avatar from local cache
  getRockstarAvatar: () => ipcRenderer.invoke('rockstar:getAvatar'),

  // ===== Protocol URL (magic-link login) =====
  getProtocolUrl: function () { return ipcRenderer.invoke('auth:getProtocolUrl'); },
  onProtocolUrl: function (cb) { ipcRenderer.on('auth:protocol-url', function (_e, url) { cb(url); }); },

  // ===== Open URL in default browser =====
  openExternal: function (url) { return ipcRenderer.invoke('app:openExternal', url); }
});
