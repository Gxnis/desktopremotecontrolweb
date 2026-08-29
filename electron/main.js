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
  try {
    const screenSize = robot.getScreenSize();
    const screenX = Math.floor(x * screenSize.width);
    const screenY = Math.floor(y * screenSize.height);
    console.log('Moving mouse to:', screenX, screenY, 'from normalized:', x, y);
    robot.moveMouse(screenX, screenY);
  } catch (error) {
    console.error('Error moving mouse:', error);
  }
});

ipcMain.on('remote-mouse-click', (event, { button, x, y }) => {
  try {
    const screenSize = robot.getScreenSize();
    const screenX = Math.floor(x * screenSize.width);
    const screenY = Math.floor(y * screenSize.height);
    console.log('Clicking at:', screenX, screenY, 'button:', button);
    
    // Move to position first
    robot.moveMouse(screenX, screenY);
    
    // Small delay to ensure position is set
    setTimeout(() => {
      if (button === 0) {
        robot.mouseClick('left');
      } else if (button === 2) {
        robot.mouseClick('right');
      } else if (button === 1) {
        robot.mouseClick('middle');
      }
    }, 10);
  } catch (error) {
    console.error('Error clicking mouse:', error);
  }
});

ipcMain.on('remote-keyboard', (event, { key, keyCode }) => {
  try {
    console.log('Keyboard key:', key, 'keyCode:', keyCode);
    robot.keyTap(key);
  } catch (error) {
    console.error('Error with keyboard:', error);
  }
});
