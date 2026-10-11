const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');

// Enable Web Bluetooth and experimental web platform features
app.commandLine.appendSwitch('enable-web-bluetooth', 'true');
app.commandLine.appendSwitch('enable-experimental-web-platform-features', 'true');

let mainWindow = null;
let bluetoothTimer = null;
let discoveredDevices = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#050811',
    title: 'VeloTrain | Indoor Smart Trainer & Workout Studio',
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Remove default menu bar for clean sleek HUD experience (press Alt to show if needed)
  mainWindow.setMenuBarVisibility(false);

  // Load the built Vite React app
  const indexPath = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(indexPath);

  // Web Bluetooth Device Selection
  mainWindow.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
    event.preventDefault();

    deviceList.forEach((d) => {
      if (d.deviceName && d.deviceName.trim().length > 0) {
        discoveredDevices.set(d.deviceId, d);
      }
    });

    if (bluetoothTimer) {
      clearTimeout(bluetoothTimer);
    }

    // Give 1.2s to discover nearby sensors
    bluetoothTimer = setTimeout(async () => {
      const list = Array.from(discoveredDevices.values());
      discoveredDevices.clear();

      if (list.length === 0) {
        callback('');
        return;
      }

      if (list.length === 1) {
        callback(list[0].deviceId);
        return;
      }

      // If multiple sensors found, let user pick
      const buttons = list.map((d) => d.deviceName);
      buttons.push('Cancel');

      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons,
        defaultId: 0,
        cancelId: buttons.length - 1,
        title: 'Bluetooth Sensor Pairing',
        message: 'Select which Bluetooth device to connect:',
      });

      if (response < list.length) {
        callback(list[response].deviceId);
      } else {
        callback('');
      }
    }, 1200);
  });

  // Automatically confirm pairing if required by trainer
  if (mainWindow.webContents.session.setBluetoothPairingHandler) {
    mainWindow.webContents.session.setBluetoothPairingHandler((details, callback) => {
      callback({ response: 'confirm' });
    });
  }

  // Handle downloads (FIT files, workouts) saving directly to Downloads directory
  mainWindow.webContents.session.on('will-download', (event, item) => {
    const downloadsFolder = app.getPath('downloads');
    const savePath = path.join(downloadsFolder, item.getFilename());
    item.setSavePath(savePath);

    item.once('done', (_event, state) => {
      if (state === 'completed') {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'File .FIT Salvato',
          message: `File salvato con successo in Downloads:\n${savePath}`,
          buttons: ['OK'],
        });
      }
    });
  });

  // Keyboard shortcut F11 for fullscreen
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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

