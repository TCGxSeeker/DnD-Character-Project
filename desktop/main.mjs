import { app, BrowserWindow, dialog, shell } from "electron";
import { join } from "node:path";
import { createPortableServer } from "../scripts/serve-portable.mjs";

const APP_PORT = 41731;
const APP_ORIGIN = `http://127.0.0.1:${APP_PORT}`;
const isSmokeTest = process.argv.includes("--smoke-test");
let applicationServer;
let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 1024,
    minWidth: 390,
    minHeight: 640,
    backgroundColor: "#07110f",
    icon: join(app.getAppPath(), "dist", "client", "icon-512.png"),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url) && !url.startsWith(APP_ORIGIN)) void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(APP_ORIGIN)) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    }
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  void mainWindow.loadURL(APP_ORIGIN);
}

async function startApplication() {
  const clientRoot = join(app.getAppPath(), "dist", "client");
  applicationServer = createPortableServer(clientRoot);
  await new Promise((resolve, reject) => {
    applicationServer.once("error", reject);
    applicationServer.listen(APP_PORT, "127.0.0.1", resolve);
  });
  if (isSmokeTest) {
    const response = await fetch(`${APP_ORIGIN}/health`);
    if (!response.ok || (await response.json()).status !== "ok") throw new Error("Packaged application health check failed.");
    await new Promise((resolve) => applicationServer.close(resolve));
    app.quit();
    return;
  }
  createMainWindow();
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(startApplication).catch((error) => {
    dialog.showErrorBox(
      "Arcane Observatory could not start",
      error?.code === "EADDRINUSE"
        ? `The local application port ${APP_PORT} is already in use. Close the other Arcane Observatory process and try again.`
        : String(error?.message || error),
    );
    app.quit();
  });
}

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && applicationServer?.listening) createMainWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  applicationServer?.close();
});
