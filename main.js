// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const logger = require('./utils/logger');
const { sendDicomToRouter } = require('./utils/dicom-sender');
const { validateDicomFile } = require('./utils/dicom-validator');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC HANDLERS ---
// 1. Handle DICOM Transfer
ipcMain.handle('dicom:send', async (event, data) => {
    const { filePath, routerConfig, accessionNumber, studyDescription } = data;
    
    const result = await sendDicomToRouter(filePath, routerConfig, accessionNumber, studyDescription);
    return result;
});

// 2. Handle DICOM File Validation
ipcMain.handle('dicom:validate', async (event, filePath) => {
    logger.info(`Received request to validate DICOM file: ${filePath}`);
    const result = await validateDicomFile(filePath);
    logger.info(`Validation result for ${filePath}: ${JSON.stringify(result)}`);
    return result;
});

// 3. Handle File Selection for UI
ipcMain.handle('dialog:openFile', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'DICOM Files', extensions: ['dcm'] }]
    });

    return result.filePaths.length > 0 ? result.filePaths[0] : null;
});