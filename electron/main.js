const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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
    const screenSize = await getScreenSize();
    const screenX = Math.floor(x * screenSize.width);
    const screenY = Math.floor(y * screenSize.height);
    
    // Use PowerShell to move mouse
    await execPromise(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${screenX},${screenY})"`);
  } catch (error) {
    console.error('Error moving mouse:', error);
  }
});

ipcMain.on('remote-mouse-click', async (event, { button, x, y }) => {
  try {
    const screenSize = await getScreenSize();
    const screenX = Math.floor(x * screenSize.width);
    const screenY = Math.floor(y * screenSize.height);
    
    console.log('Click at:', screenX, screenY, 'button:', button);
    
    // Move mouse first
    await execPromise(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${screenX},${screenY})"`);
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Click using PowerShell
    if (button === 0) {
      await execPromise(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -Name User32 -Namespace Win32 -MemberDefinition '[DllImport(\\\"user32.dll\\\")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);'; $Win32::User32::mouse_event(0x0002, 0, 0, 0, 0); $Win32::User32::mouse_event(0x0004, 0, 0, 0, 0)"`);
    } else if (button === 2) {
      await execPromise(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -Name User32 -Namespace Win32 -MemberDefinition '[DllImport(\\\"user32.dll\\\")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);'; $Win32::User32::mouse_event(0x0008, 0, 0, 0, 0); $Win32::User32::mouse_event(0x0010, 0, 0, 0, 0)"`);
    }
    
    console.log('Click completed');
  } catch (error) {
    console.error('Error clicking mouse:', error);
  }
});

ipcMain.on('remote-keyboard', async (event, { key, keyCode }) => {
  try {
    // Use PowerShell for keyboard input
    await execPromise(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${key}')"`);
  } catch (error) {
    console.error('Error with keyboard:', error);
  }
});

async function getScreenSize() {
  try {
    const { stdout } = await execPromise('powershell -Command "Get-WmiObject -Class Win32_DesktopMonitor | Select-Object ScreenWidth,ScreenHeight"');
    // Parse output or use default
    return { width: 1920, height: 1080 };
  } catch (error) {
    return { width: 1920, height: 1080 };
  }
}
