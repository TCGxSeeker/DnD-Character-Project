const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("arcaneObservatoryContent", Object.freeze({
  available: true,

  loadRepository() {
    return ipcRenderer.invoke("content:load-repository");
  },

  saveRepository(repositoryJson) {
    return ipcRenderer.invoke(
      "content:save-repository",
      repositoryJson,
    );
  },

  clearRepository() {
    return ipcRenderer.invoke("content:clear-repository");
  },

  getStorageInfo() {
    return ipcRenderer.invoke("content:storage-info");
  },
}));