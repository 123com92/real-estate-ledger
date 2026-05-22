const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApp", {
  getInfo: () => ipcRenderer.invoke("desktop:get-info"),
  getMachineCode: () => ipcRenderer.invoke("desktop:get-machine-code"),
  loadState: () => ipcRenderer.invoke("desktop:load-state"),
  saveState: (state) => ipcRenderer.invoke("desktop:save-state", state),
  loadLicense: () => ipcRenderer.invoke("desktop:load-license"),
  saveLicense: (licenseCode) => ipcRenderer.invoke("desktop:save-license", licenseCode),
});
