import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { join } from "node:path";
import { createPortableServer } from "../scripts/serve-portable.mjs";
import {
  clearContentRepositoryFiles,
  loadContentRepositoryFile,
  saveContentRepositoryFile,
} from "./contentRepositoryFile.mjs";

const APP_PORT = 41731;
const APP_ORIGIN = `http://127.0.0.1:${APP_PORT}`;
const CONTENT_DIRECTORY_NAME = "content";
const CONTENT_REPOSITORY_FILE = "repository.json";
const MAX_CONTENT_REPOSITORY_BYTES = 25 * 1024 * 1024;
const isSmokeTest = process.argv.includes("--smoke-test");
let applicationServer;
let mainWindow;

function contentDirectoryPath() {
  return join(
    app.getPath("userData"),
    CONTENT_DIRECTORY_NAME,
  );
}

function contentRepositoryPath() {
  return join(
    contentDirectoryPath(),
    CONTENT_REPOSITORY_FILE,
  );
}

async function loadDesktopContentRepository() {
  return loadContentRepositoryFile(contentRepositoryPath());
}

async function saveDesktopContentRepository(
  repositoryJson,
) {
  return saveContentRepositoryFile(
    contentRepositoryPath(),
    repositoryJson,
    { maxBytes: MAX_CONTENT_REPOSITORY_BYTES },
  );
}

async function clearDesktopContentRepository() {
  return clearContentRepositoryFiles(contentRepositoryPath());
}

function registerContentIpc() {
  ipcMain.handle(
    "content:load-repository",
    () => loadDesktopContentRepository(),
  );

  ipcMain.handle(
    "content:save-repository",
    (_event, repositoryJson) =>
      saveDesktopContentRepository(repositoryJson),
  );

  ipcMain.handle(
    "content:clear-repository",
    () => clearDesktopContentRepository(),
  );

  ipcMain.handle(
    "content:storage-info",
    () => ({
      kind: "filesystem",
      directory: contentDirectoryPath(),
      repositoryFile: contentRepositoryPath(),
    }),
  );
}
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
      preload: join(
        app.getAppPath(),
        "desktop",
        "preload.cjs",
      ),
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

  app.whenReady().then(() => {
    registerContentIpc();
    return startApplication();
  }).catch((error) => {
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
