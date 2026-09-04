import { contextBridge, ipcRenderer } from 'electron';
import type {
  IpcResult,
  LibraryEntry,
  MainEvent,
  ModCatalog,
  PortConfig,
  PortyoshkaApi,
  RomStatus,
  SettingsData,
  UpdateCheckResponse,
} from './shared/types';

const invoke = <T,>(channel: string, ...args: unknown[]): Promise<IpcResult<T>> =>
  ipcRenderer.invoke(channel, ...args) as Promise<IpcResult<T>>;

const api: PortyoshkaApi = {
  getLibrary: () => invoke<LibraryEntry[]>('library:get'),
  getCatalog: () => invoke<PortConfig[]>('catalog:get'),
  checkForUpdates: (force = false) => invoke<UpdateCheckResponse>('updates:check', force),
  installUpdate: () => invoke<null>('update:install'),
  startInstall: (portId) => invoke<null>('install:start', portId),
  cancelInstall: (portId) => invoke<null>('install:cancel', portId),
  pickRom: (portId) => invoke<RomStatus>('rom:pick', portId),
  getRomStatus: (portId) => invoke<RomStatus>('rom:status', portId),
  launch: (portId) => invoke<null>('launch:start', portId),
  stopLaunch: (portId) => invoke<null>('launch:stop', portId),
  showFolder: (portId) => invoke<null>('port:showFolder', portId),
  openRepo: (portId) => invoke<null>('port:openRepo', portId),
  openExternal: (url) => invoke<null>('shell:openExternal', url),
  addSteamShortcut: (portId, iconData) => invoke<string>('steam:addShortcut', portId, iconData),
  removeSteamShortcut: (portId) => invoke<null>('steam:removeShortcut', portId),
  uninstall: (portId, keepSettings) => invoke<null>('uninstall:start', portId, keepSettings),
  exportLog: (portId, content) => invoke<string | null>('log:export', portId, content),
  getMods: (portId) => invoke<ModCatalog>('mods:get', portId),
  installMod: (portId, modId) => invoke<ModCatalog>('mods:install', portId, modId),
  uninstallMod: (portId, modId) => invoke<ModCatalog>('mods:uninstall', portId, modId),
  getSettings: () => invoke<SettingsData>('settings:get'),
  setSettings: (patch) => invoke<SettingsData>('settings:set', patch),
  setPortDirOverride: (portId, dir) => invoke<SettingsData>('settings:setPortDirOverride', portId, dir),
  pickDirectory: () => invoke<string | null>('dialog:pickDirectory'),
  minimizeWindow: () => invoke<null>('window:minimize'),
  toggleMaximizeWindow: () => invoke<null>('window:toggleMaximize'),
  closeWindow: () => invoke<null>('window:close'),
  getWindowMaximized: () => invoke<boolean>('window:isMaximized'),
  onWindowStateChange(cb) {
    const listener = (_event: unknown, maximized: boolean) => cb(maximized);
    ipcRenderer.on('portyoshka:windowState', listener);
    return () => {
      ipcRenderer.removeListener('portyoshka:windowState', listener);
    };
  },
  onEvent(cb) {
    const listener = (_event: unknown, payload: MainEvent) => cb(payload);
    ipcRenderer.on('portyoshka:event', listener);
    return () => {
      ipcRenderer.removeListener('portyoshka:event', listener);
    };
  },
};

contextBridge.exposeInMainWorld('portyoshka', api);
