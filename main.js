const { app, BrowserWindow, ipcMain, Notification, dialog } = require('electron');
const path = require('path');
const log = require('./src/logger');
const WindowStateManager = require('./src/windowState');
const { createTray, updateContextMenu } = require('./src/tray');
const { initUpdater, triggerCheck } = require('./src/updater');
const autoLaunch = require('./src/autoLaunch');

// Define runtime environment
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
log.info(`Application Environment: ${isDev ? 'Development' : 'Production'}`);

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  log.warn('HRMS Desktop is already running. Focus will be shifted to the active instance.');
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let windowStateManager = null;
let isUpdateDownloading = false;
let mainLoaded = false;

// Check if launched hidden (via system startup)
const isStartHidden = process.argv.includes('--hidden');

// Handle second instance startup
app.on('second-instance', () => {
  log.info('Second instance launch attempted. Restoring and focusing main window.');
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

// Initialize main portal window
function loadMainWindow() {
  if (mainLoaded) return;
  mainLoaded = true;

  log.info('Initializing main portal window...');
  
  // Track window size and position
  windowStateManager = new WindowStateManager('main', { width: 1280, height: 800 });

  const iconPath = path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
  mainWindow = new BrowserWindow({
    x: windowStateManager.state.x,
    y: windowStateManager.state.y,
    width: windowStateManager.state.width,
    height: windowStateManager.state.height,
    show: false, // Keep hidden until fully loaded
    title: 'HRMS',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Track window bounds
  windowStateManager.track(mainWindow);

  // Set up system tray
  createTray(mainWindow, (manual) => {
    triggerCheck(manual, mainWindow);
  });

  // Handle window close event (Minimize to Tray instead of Exit)
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      log.info('Main window hidden to tray.');

      // Show notification on first tray minimization
      if (!app.hasShownTrayNotification) {
        const notify = new Notification({
          title: 'HRMS Desktop',
          body: 'HRMS is running in the background. Restore it from the system tray.',
          silent: true
        });
        notify.show();
        app.hasShownTrayNotification = true;
      }
    } else {
      log.info('Quitting application. Saving window state...');
      windowStateManager.saveState(mainWindow);
    }
  });

  // Initialize updates check
  initUpdater(mainWindow, null, (downloading) => {
    if (downloading) {
      isUpdateDownloading = true;
      log.info('An update is available and downloading in the background.');
    } else {
      log.info('No update downloading.');
    }
  });

  // Run startup update check
  triggerCheck(false, mainWindow);

  // Load the production HRMS live portal URL
  const portalUrl = 'https://hrms.ehworkspace.com/signin';
  mainWindow.loadURL(portalUrl);

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('Live HRMS Portal loaded successfully.');
    showMainWindow();
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log.error(`Failed to load live portal: ${errorDescription} (${errorCode}). Retrying in 5 seconds...`);
    
    // Show window on connection failure so user knows it's offline/retrying
    showMainWindow();

    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(portalUrl);
      }
    }, 5000);
  });
}

// Show the main window
function showMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (isStartHidden) {
      log.info('Application started via autostart. Remaining hidden in tray.');
    } else {
      mainWindow.show();
      if (windowStateManager.state.isMaximized) {
        mainWindow.maximize();
      }
      mainWindow.focus();
    }
  }
}

// App Initialization
app.whenReady().then(async () => {
  log.info('Electron app ready.');
  
  // Set App User Model ID for Windows taskbar icon consistency
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.ehworkspace.hrms');
  }
  
  // Register IPC API Handlers
  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.on('send-notification', (event, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    } else {
      log.warn('Desktop notifications are not supported on this platform.');
    }
  });

  ipcMain.on('check-for-updates', () => {
    triggerCheck(true, mainWindow);
  });

  ipcMain.on('install-update', () => {
    log.info('Installing update immediately...');
    app.isQuitting = true;
    require('electron-updater').autoUpdater.quitAndInstall();
  });

  // Setup auto-launch configuration registry/defaults (e.g. check status log)
  const isAutoLaunch = await autoLaunch.isEnabled();
  log.info(`Auto-launch status on start: ${isAutoLaunch}`);

  // Create UI windows directly
  loadMainWindow();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    log.info('All windows closed. Quitting.');
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    loadMainWindow();
  }
});

// Handle graceful terminations
app.on('before-quit', () => {
  app.isQuitting = true;
});
