const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const robot = require('robotjs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the app from the local server
  mainWindow.loadURL('http://localhost:3000');
  
  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for remote control
ipcMain.on('remote-mouse-move', (event, { x, y }) => {
  const screenX = Math.floor(x * robot.getScreenSize().width);
  const screenY = Math.floor(y * robot.getScreenSize().height);
  robot.moveMouse(screenX, screenY);
});

ipcMain.on('remote-mouse-click', (event, { button, x, y }) => {
  const screenX = Math.floor(x * robot.getScreenSize().width);
  const screenY = Math.floor(y * robot.getScreenSize().height);
  robot.moveMouse(screenX, screenY);
  
  if (button === 0) {
    robot.mouseClick('left');
  } else if (button === 2) {
    robot.mouseClick('right');
  } else if (button === 1) {
    robot.mouseClick('middle');
  }
});

ipcMain.on('remote-keyboard', (event, { key, keyCode }) => {
  robot.keyTap(key);
});
