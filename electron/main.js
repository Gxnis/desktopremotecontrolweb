const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { mouse, screen, keyboard, Key, Button } = require('@nut-tree/nut-js');

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
    const screenSize = await screen.size();
    const screenX = Math.floor(x * screenSize.width);
    const screenY = Math.floor(y * screenSize.height);
    await mouse.setPosition({ x: screenX, y: screenY });
  } catch (error) {
    console.error('Error moving mouse:', error);
  }
});

ipcMain.on('remote-mouse-click', async (event, { button, x, y }) => {
  try {
    const screenSize = await screen.size();
    const screenX = Math.floor(x * screenSize.width);
    const screenY = Math.floor(y * screenSize.height);
    
    console.log('Click at:', screenX, screenY, 'button:', button);
    
    await mouse.setPosition({ x: screenX, y: screenY });
    
    // Small delay to ensure position is set
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (button === 0) {
      await mouse.toggle(Button.LEFT, true);
      await new Promise(resolve => setTimeout(resolve, 50));
      await mouse.toggle(Button.LEFT, false);
    } else if (button === 2) {
      await mouse.toggle(Button.RIGHT, true);
      await new Promise(resolve => setTimeout(resolve, 50));
      await mouse.toggle(Button.RIGHT, false);
    } else if (button === 1) {
      await mouse.toggle(Button.MIDDLE, true);
      await new Promise(resolve => setTimeout(resolve, 50));
      await mouse.toggle(Button.MIDDLE, false);
    }
    
    console.log('Click completed');
  } catch (error) {
    console.error('Error clicking mouse:', error);
  }
});

ipcMain.on('remote-keyboard', async (event, { key, keyCode }) => {
  try {
    await keyboard.pressKey(Key[key.toUpperCase()] || key);
    await keyboard.releaseKey(Key[key.toUpperCase()] || key);
  } catch (error) {
    console.error('Error with keyboard:', error);
  }
});
