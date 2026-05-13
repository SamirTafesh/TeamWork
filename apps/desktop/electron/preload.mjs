import { contextBridge, ipcRenderer } from "electron";

const NATIVE_DEEP_LINK_EVENT = "teamwork:deep-link-native";

function normalizePlatform(value) {
  if (value === "darwin" || value === "linux") return value;
  if (value === "win32") return "windows";
  return "linux";
}

function applyShellDocumentMarkers() {
  try {
    const root = document?.documentElement;
    if (!root) return false;

    root.dataset.teamworkShell = "electron";
    root.classList.add("teamwork-electron");
    if (process.platform === "darwin") {
      root.classList.add("teamwork-platform-mac");
    } else if (process.platform === "win32") {
      root.classList.add("teamwork-platform-windows");
    } else if (process.platform === "linux") {
      root.classList.add("teamwork-platform-linux");
    }
    return true;
  } catch {
    return false;
  }
}

contextBridge.exposeInMainWorld("__TEAMWORK_ELECTRON__", {
  invokeDesktop(command, ...args) {
    return ipcRenderer.invoke("teamwork:desktop", command, ...args);
  },
  shell: {
    openExternal(url) {
      return ipcRenderer.invoke("teamwork:shell:openExternal", url);
    },
    relaunch() {
      return ipcRenderer.invoke("teamwork:shell:relaunch");
    },
  },
  migration: {
    readSnapshot() {
      return ipcRenderer.invoke("teamwork:migration:read");
    },
    ackSnapshot() {
      return ipcRenderer.invoke("teamwork:migration:ack");
    },
  },
  updater: {
    getChannel() {
      return ipcRenderer.invoke("teamwork:updater:getChannel");
    },
    setChannel(channel) {
      return ipcRenderer.invoke("teamwork:updater:setChannel", channel);
    },
    check() {
      return ipcRenderer.invoke("teamwork:updater:check");
    },
    download() {
      return ipcRenderer.invoke("teamwork:updater:download");
    },
    installAndRestart() {
      return ipcRenderer.invoke("teamwork:updater:installAndRestart");
    },
    /** Subscribe to incremental download progress from electron-updater. */
    onDownloadProgress(callback) {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on("teamwork:updater:download-progress", handler);
      return () => {
        ipcRenderer.removeListener("teamwork:updater:download-progress", handler);
      };
    },
  },
  browser: {
    show(bounds) { return ipcRenderer.invoke("teamwork:browser:show", bounds); },
    hide() { return ipcRenderer.invoke("teamwork:browser:hide"); },
    navigate(url) { return ipcRenderer.invoke("teamwork:browser:navigate", url); },
    back() { return ipcRenderer.invoke("teamwork:browser:back"); },
    forward() { return ipcRenderer.invoke("teamwork:browser:forward"); },
    reload() { return ipcRenderer.invoke("teamwork:browser:reload"); },
    setBounds(bounds) { return ipcRenderer.invoke("teamwork:browser:bounds", bounds); },
    getState() { return ipcRenderer.invoke("teamwork:browser:state"); },
    destroy() { return ipcRenderer.invoke("teamwork:browser:destroy"); },
    onStateChange(callback) {
      const handler = (_event, state) => callback(state);
      ipcRenderer.on("teamwork:browser:state", handler);
      return () => ipcRenderer.removeListener("teamwork:browser:state", handler);
    },
    onPanelOpened(callback) {
      const handler = () => callback();
      ipcRenderer.on("teamwork:browser:panel-opened", handler);
      return () => ipcRenderer.removeListener("teamwork:browser:panel-opened", handler);
    },
    onPanelClosed(callback) {
      const handler = () => callback();
      ipcRenderer.on("teamwork:browser:panel-closed", handler);
      return () => ipcRenderer.removeListener("teamwork:browser:panel-closed", handler);
    },
  },
  meta: {
    initialDeepLinks: [],
    platform: normalizePlatform(process.platform),
    version: process.versions.electron,
  },
});

ipcRenderer.on(NATIVE_DEEP_LINK_EVENT, (_event, urls) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NATIVE_DEEP_LINK_EVENT, { detail: urls }));
});

if (!applyShellDocumentMarkers() && typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", applyShellDocumentMarkers, { once: true });
}
