const { autoUpdater } = require('electron-updater');
const { dialog, app } = require('electron');
const log = require('./logger');

// Set autoUpdater logger to our electron-log configuration
autoUpdater.logger = log;

// Download updates automatically in the background
autoUpdater.autoDownload = true;

let isManualCheck = false;
let updateWindowRef = null;

function initUpdater(mainWindow, splashWindow, onUpdateCheckDone) {
  // Helper to send status to whichever window is active
  const sendStatus = (statusMessage) => {
    log.info(`AutoUpdater: ${statusMessage}`);
    
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send('update-status', statusMessage);
    }
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', statusMessage);
    }
  };

  autoUpdater.on('checking-for-update', () => {
    sendStatus('Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    sendStatus(`Update v${info.version} available. Downloading...`);
    if (onUpdateCheckDone) onUpdateCheckDone(true); // Update is downloading, hold splash screen
  });

  autoUpdater.on('update-not-available', (info) => {
    sendStatus('Application is up to date.');
    if (onUpdateCheckDone) onUpdateCheckDone(false); // No update, proceed to main window
    if (isManualCheck) {
      dialog.showMessageBox(mainWindow || null, {
        type: 'info',
        title: 'Check for Updates',
        message: 'You are running the latest version of HRMS.',
        buttons: ['OK']
      });
      isManualCheck = false;
    }
  });

  autoUpdater.on('error', (err) => {
    log.error('AutoUpdater Error:', err);
    sendStatus(`Update error: ${err.message || 'Unknown error'}`);
    if (onUpdateCheckDone) onUpdateCheckDone(false); // Error occurred, proceed to main window
    if (isManualCheck) {
      dialog.showMessageBox(mainWindow || null, {
        type: 'error',
        title: 'Update Check Failed',
        message: `An error occurred while checking for updates: ${err.message || err}`,
        buttons: ['OK']
      });
      isManualCheck = false;
    }
  });


  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    sendStatus(`Downloading update: ${percent}%`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendStatus('Update downloaded. Ready to install.');
    
    dialog.showMessageBox({
      type: 'question',
      title: 'Update Ready',
      message: `A new version of HRMS (v${info.version}) has been downloaded. Would you like to restart and install it now?`,
      buttons: ['Restart & Install', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        log.info('User approved update. Quitting and installing...');
        app.isQuitting = true;
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });
}

function triggerCheck(manual = false, windowContext = null) {
  isManualCheck = manual;
  updateWindowRef = windowContext;
  log.info(`Manual update check triggered: ${manual}`);
  
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    log.error('Failed to run update check:', err);
  });
}

module.exports = {
  initUpdater,
  triggerCheck
};
