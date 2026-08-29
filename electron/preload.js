const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  remoteMouseMove: (x, y) => ipcRenderer.send('remote-mouse-move', { x, y }),
  remoteMouseClick: (button, x, y) => ipcRenderer.send('remote-mouse-click', { button, x, y }),
  remoteKeyboard: (key, keyCode) => ipcRenderer.send('remote-keyboard', { key, keyCode }),
  isElectron: () => true
});
