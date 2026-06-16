const path = require("path");
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { createDesktopDatabase } = require("./database");

let mainWindow;
let store;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 860,
    minWidth: 980,
    minHeight: 700,
    title: "房产记账本",
    backgroundColor: "#f4f6f2",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.removeMenu();
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.loadFile(path.join(__dirname, "..", "index.html"), {
    query: { standalone: "1", desktop: "1" },
  });
}

function registerIpc() {
  ipcMain.handle("desktop:get-info", () => ({
    appName: app.getName(),
    version: app.getVersion(),
    dbPath: store.dbPath,
    userDataPath: app.getPath("userData"),
  }));

  ipcMain.handle("desktop:get-machine-code", () => store.getMachineCode());
  ipcMain.handle("desktop:load-state", () => store.getJson("ledgerState", null));
  ipcMain.handle("desktop:save-state", (_event, state) => {
    store.setJson("ledgerState", state);
    return { ok: true };
  });
  ipcMain.handle("desktop:load-license", () => store.get("licenseCode", ""));
  ipcMain.handle("desktop:save-license", (_event, licenseCode) => {
    store.set("licenseCode", String(licenseCode || ""));
    return { ok: true };
  });
}

app.whenReady().then(() => {
  store = createDesktopDatabase(app.getPath("userData"));
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  store?.close();
});
