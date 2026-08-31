const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { mouseMove, mouseClick, typeString, keyPress } = require('node-native-win-utils');

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
ipcMain.on('remote-mouse-move', async (event, { x, y }) => {
  try {
    const screenX = Math.floor(x * 1920);
    const screenY = Math.floor(y * 1080);
    mouseMove(screenX, screenY);
  } catch (error) {
    console.error('Error moving mouse:', error);
  }
});

ipcMain.on('remote-mouse-click', async (event, { button, x, y }) => {
  try {
    const screenX = Math.floor(x * 1920);
    const screenY = Math.floor(y * 1080);
    
    console.log('Click at:', screenX, screenY, 'button:', button);
    
    mouseMove(screenX, screenY);
    
    // Small delay to ensure position is set
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (button === 0) {
      mouseClick('left');
    } else if (button === 2) {
      mouseClick('right');
    } else if (button === 1) {
      mouseClick('middle');
    }
    
    console.log('Click completed');
  } catch (error) {
    console.error('Error clicking mouse:', error);
  }
});

ipcMain.on('remote-keyboard', async (event, { key, keyCode }) => {
  try {
    console.log('Keyboard key:', key);
    typeString(key, 10);
  } catch (error) {
    console.error('Error with keyboard:', error);
  }
});
