// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // DICOM IPC
  sendDicom: (data) => ipcRenderer.invoke('dicom:send', data),
  
  // UI Helpers
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),

  // Logging (for UI display)
  // You would typically set up a listener from main.js to push logs to the renderer
  onLog: (callback) => ipcRenderer.on('app:log', (event, logEntry) => callback(logEntry))
});