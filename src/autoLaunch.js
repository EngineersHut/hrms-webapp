const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('./logger');

const getLinuxAutostartPath = () => {
  const home = process.env.HOME || path.join('/home', process.env.USER || 'user');
  return path.join(home, '.config', 'autostart', 'hrms.desktop');
};

const getLinuxDesktopContent = () => {
  const appPath = app.getPath('exe');
  return `[Desktop Entry]
Type=Application
Version=1.0
Name=HRMS
Comment=HRMS Desktop Application
Exec="${appPath}" --hidden
StartupNotify=false
Terminal=false
Icon=hrms
`;
};

const autoLaunch = {
  isEnabled: async () => {
    try {
      if (process.platform === 'win32' || process.platform === 'darwin') {
        const settings = app.getLoginItemSettings();
        return settings.openAtLogin;
      } else if (process.platform === 'linux') {
        const autostartPath = getLinuxAutostartPath();
        return fs.existsSync(autostartPath);
      }
    } catch (err) {
      log.error('Error checking auto-launch status:', err);
    }
    return false;
  },

  enable: async () => {
    try {
      if (process.platform === 'win32' || process.platform === 'darwin') {
        app.setLoginItemSettings({
          openAtLogin: true,
          path: app.getPath('exe'),
          args: ['--hidden']
        });
        log.info(`Auto-launch enabled on ${process.platform === 'win32' ? 'Windows' : 'macOS'}`);
      } else if (process.platform === 'linux') {
        const autostartPath = getLinuxAutostartPath();
        const dir = path.dirname(autostartPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(autostartPath, getLinuxDesktopContent(), 'utf8');
        try {
          fs.chmodSync(autostartPath, '0755');
        } catch (chmodErr) {
          log.warn('Could not set executable permissions on autostart desktop entry:', chmodErr);
        }
        log.info('Auto-launch enabled on Linux');
      }
      return true;
    } catch (err) {
      log.error('Failed to enable auto-launch:', err);
      return false;
    }
  },

  disable: async () => {
    try {
      if (process.platform === 'win32' || process.platform === 'darwin') {
        app.setLoginItemSettings({
          openAtLogin: false
        });
        log.info(`Auto-launch disabled on ${process.platform === 'win32' ? 'Windows' : 'macOS'}`);
      } else if (process.platform === 'linux') {
        const autostartPath = getLinuxAutostartPath();
        if (fs.existsSync(autostartPath)) {
          fs.unlinkSync(autostartPath);
        }
        log.info('Auto-launch disabled on Linux');
      }
      return true;
    } catch (err) {
      log.error('Failed to disable auto-launch:', err);
      return false;
    }
  }
};

module.exports = autoLaunch;
