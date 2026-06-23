const fs = require('fs');
const path = require('path');
const { app, screen } = require('electron');
const log = require('./logger');

class WindowStateManager {
  constructor(windowName, defaults = { width: 1280, height: 800 }) {
    this.windowName = windowName;
    this.defaults = defaults;
    this.userDataPath = app.getPath('userData');
    this.stateFilePath = path.join(this.userDataPath, `window-state-${windowName}.json`);
    
    this.state = this.loadState();
  }

  loadState() {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const fileContent = fs.readFileSync(this.stateFilePath, 'utf8');
        const parsedState = JSON.parse(fileContent);
        
        // Validate if state window is visible on current screens
        if (this.isWindowStateVisible(parsedState)) {
          return parsedState;
        }
      }
    } catch (err) {
      log.error('Error loading window state:', err);
    }
    
    return { ...this.defaults };
  }

  isWindowStateVisible(state) {
    if (state.x === undefined || state.y === undefined) return false;
    
    const displays = screen.getAllDisplays();
    return displays.some(display => {
      const bounds = display.bounds;
      return (
        state.x >= bounds.x &&
        state.y >= bounds.y &&
        state.x + (state.width || 100) <= bounds.x + bounds.width &&
        state.y + (state.height || 100) <= bounds.y + bounds.height
      );
    });
  }

  saveState(window) {
    if (!window || window.isDestroyed()) return;

    try {
      const bounds = window.getBounds();
      this.state.isMaximized = window.isMaximized();
      
      if (!this.state.isMaximized) {
        this.state.x = bounds.x;
        this.state.y = bounds.y;
        this.state.width = bounds.width;
        this.state.height = bounds.height;
      }
      
      fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (err) {
      log.error('Error saving window state:', err);
    }
  }

  track(window) {
    const events = ['resize', 'move', 'close'];
    const saveStateFn = () => this.saveState(window);

    events.forEach(event => {
      window.on(event, saveStateFn);
    });
  }
}

module.exports = WindowStateManager;
