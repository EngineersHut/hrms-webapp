const log = require('electron-log');
const path = require('path');
const { app } = require('electron');

// Configure log format and level
log.transports.console.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

// Keep logs up to 10MB, rotate older logs
log.transports.file.maxSize = 10 * 1024 * 1024;

// Set custom file path inside user data directory
try {
  const logDir = app ? app.getPath('userData') : '.';
  log.transports.file.resolvePathFn = () => path.join(logDir, 'logs', 'main.log');
} catch (err) {
  console.error('Failed to set log file path:', err);
}

// Log application startup details
log.info('=== HRMS Desktop Application Starting ===');
log.info(`Version: ${app ? app.getVersion() : 'unknown'}`);
log.info(`Platform: ${process.platform} (${process.arch})`);
log.info(`Node.js: ${process.versions.node}`);
log.info(`Chrome: ${process.versions.chrome}`);
log.info(`Electron: ${process.versions.electron}`);

// Catch unhandled exceptions and promise rejections
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception in Main Process:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection in Main Process at:', promise, 'reason:', reason);
});

module.exports = log;
