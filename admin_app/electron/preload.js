const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('adminAPI', {
  getUsers: () => ipcRenderer.invoke('users-get'),
  saveUsers: (users) => ipcRenderer.invoke('users-save', users),
  usersPath: () => ipcRenderer.invoke('users-path'),
});