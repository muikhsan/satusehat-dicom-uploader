// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const logger = require('./utils/logger');
const { sendDicomToRouter } = require('./utils/dicom-sender');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Using a preload script for security
      nodeIntegration: false, // Security best practice
      contextIsolation: true, // Security best practice
    },
  });

  mainWindow.loadFile('index.html');
  logger.info('SATUSEHAT DICOM Bridge application started.');

  // mainWindow.webContents.openDevTools(); // Uncomment for debugging
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { // 'darwin' is macOS
    app.quit();
  }
});

// --- IPC HANDLERS ---
// 1. Handle DICOM Transfer
ipcMain.handle('dicom:send', async (event, data) => {
    const { filePath, routerConfig, accessionNumber, studyDescription } = data;
    
    // NOTE: In a real app, you might validate the Accession Number against FHIR first.
    
    const result = await sendDicomToRouter(filePath, routerConfig, accessionNumber, studyDescription);
    return result;
});

// 3. Handle File Selection for UI
ipcMain.handle('dialog:openFile', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'DICOM Files', extensions: ['dcm'] }]
    });
    // Return the selected file path
    return result.filePaths.length > 0 ? result.filePaths[0] : null;
});