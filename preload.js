const { contextBridge, ipcRenderer } = require('electron');

// Securely expose APIs to the renderer processes (main site and splash screen)
contextBridge.exposeInMainWorld('electronAPI', {
  // General application metadata
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Custom notifications support
  sendNotification: (title, body) => ipcRenderer.send('send-notification', { title, body }),
  
  // Auto-update event listeners
  onUpdateStatus: (callback) => {
    const subscription = (event, statusText) => callback(statusText);
    ipcRenderer.on('update-status', subscription);
    return () => ipcRenderer.removeListener('update-status', subscription);
  },
  
  onUpdateAvailable: (callback) => {
    const subscription = (event, info) => callback(info);
    ipcRenderer.on('update-available', subscription);
    return () => ipcRenderer.removeListener('update-available', subscription);
  },
  
  onUpdateDownloaded: (callback) => {
    const subscription = (event, info) => callback(info);
    ipcRenderer.on('update-downloaded', subscription);
    return () => ipcRenderer.removeListener('update-downloaded', subscription);
  },
  
  // Manual actions
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  installUpdate: () => ipcRenderer.send('install-update')
});
