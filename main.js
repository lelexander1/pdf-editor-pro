const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

function createWindow(filePath = null) {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        autoHideMenuBar: true, 
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html').then(() => {
        if (filePath) {
            win.webContents.send('abrir-archivo-externo', filePath);
        }
    });
}

// Recibir orden del botón para buscar actualizaciones
ipcMain.on('buscar-actualizacion', () => {
    autoUpdater.checkForUpdatesAndNotify();
});

// Control de instancia única en Windows
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine) => {
        const archivo = commandLine.find(arg => arg.endsWith('.pdf'));
        if (archivo) {
            createWindow(archivo);
        }
    });
}

app.whenReady().then(() => {
    const archivoInicial = process.argv.find(arg => arg.endsWith('.pdf'));
    createWindow(archivoInicial);

    // Buscar actualizaciones al abrir la app de forma automática
    autoUpdater.checkForUpdatesAndNotify();

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