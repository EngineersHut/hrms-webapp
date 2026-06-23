const { Menu, Tray, app } = require('electron');
const path = require('path');
const autoLaunch = require('./autoLaunch');
const log = require('./logger');

let trayInstance = null;

function createTray(mainWindow, checkUpdatesCallback) {
  if (trayInstance) return trayInstance;

  // Choose the appropriate icon format based on platform
  const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  const iconPath = path.join(app.getAppPath(), 'assets', iconName);

  log.info(`Initializing system tray with icon: ${iconPath}`);

  try {
    trayInstance = new Tray(iconPath);
  } catch (err) {
    log.error('Failed to create tray icon instance:', err);
    return null;
  }

  trayInstance.setToolTip('HRMS Desktop');

  // Double click behavior to restore window
  trayInstance.on('double-click', () => {
    restoreWindow(mainWindow);
  });

  // Load and apply the context menu asynchronously
  updateContextMenu(mainWindow, checkUpdatesCallback);

  return trayInstance;
}

async function updateContextMenu(mainWindow, checkUpdatesCallback) {
  if (!trayInstance) return;

  try {
    const isAutoStartEnabled = await autoLaunch.isEnabled();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open HRMS',
        click: () => {
          restoreWindow(mainWindow);
        }
      },
      {
        label: 'Run at Startup',
        type: 'checkbox',
        checked: isAutoStartEnabled,
        click: async (menuItem) => {
          if (menuItem.checked) {
            await autoLaunch.enable();
          } else {
            await autoLaunch.disable();
          }
          // Refresh context menu to ensure checkbox matches actual state
          updateContextMenu(mainWindow, checkUpdatesCallback);
        }
      },
      {
        label: 'Check for Updates',
        click: () => {
          if (checkUpdatesCallback) {
            checkUpdatesCallback(true); // User triggered manual check
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          // Flag main.js that we are intentionally quitting
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    trayInstance.setContextMenu(contextMenu);
  } catch (err) {
    log.error('Failed to build/update tray context menu:', err);
  }
}

function restoreWindow(mainWindow) {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    mainWindow.focus();
  }
}

module.exports = {
  createTray,
  updateContextMenu
};
