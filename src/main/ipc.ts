import { ipcMain, dialog, shell, app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseBundle } from './db';
import type { AppPaths } from './paths';
import type { LaunchManager } from './services/launcher';
import type { SettingsStore } from './services/settings';
import { installPort } from './services/installer';
import { importRomForPort } from './services/romLibrary';
import { checkForUpdates, checkForSelfUpdate } from './services/updater';
import { performSelfUpdate } from './services/selfUpdater';
import { buildLibrary, buildCatalog, getEntryPort } from './services/library';
import { uninstallPort } from './services/uninstall';
import { addSteamShortcut, removeSteamShortcut } from './services/steamShortcuts';
import { getMods, installMod, uninstallMod } from './services/mods';
import { AppError, asAppError } from './services/errors';
import type {
  IpcResult,
  InstallProgress,
  LibraryEntry,
  MainEvent,
  ModCatalog,
  Platform,
  PortConfig,
  RomStatus,
  SelfUpdateProgress,
  SettingsData,
  UpdateCheckResponse,
  UpdateCheckResult,
} from '../shared/types';

export interface IpcDeps {
  platform: Platform;
  paths: AppPaths;
  db: DatabaseBundle;
  launchManager: LaunchManager;
  settings: SettingsStore;
  getWindow: () => BrowserWindow | null;
  getHomeDir: () => string;
}

interface QueuedInstall {
  portId: string;
  controller: AbortController;
  resolve: (result: IpcResult<null>) => void;
}

export function registerIpc(deps: IpcDeps): void {
  const installQueue: QueuedInstall[] = [];
  let currentInstall: QueuedInstall | null = null;
  let updateResults: UpdateCheckResult[] = [];

  const emit = (event: MainEvent) => {
    try {
      deps.getWindow()?.webContents.send('portyoshka:event', event);
    } catch {
      // window may be mid-destruction during shutdown
    }
  };

  const libraryDeps = () => ({
    platform: deps.platform,
    db: deps.db,
    paths: deps.paths,
    launchManager: deps.launchManager,
    updateResults,
    getHomeDir: deps.getHomeDir,
  });

  const ok = <T,>(data: T): IpcResult<T> => ({ ok: true, data });
  const fail = <T,>(err: unknown): IpcResult<T> => {
    const appErr = asAppError(err, 'UNKNOWN', 'Something went wrong');
    return { ok: false, error: { code: appErr.code, message: appErr.message, detail: appErr.detail } };
  };

  const installDeps = () => ({
    platform: deps.platform,
    paths: deps.paths,
    db: deps.db,
    getRootInstallDir: () => deps.settings.getRootInstallDir(),
    getPortDirOverride: (id: string) => deps.settings.getPortDirOverride(id),
    getGithubToken: () => deps.settings.getGithubToken(),
    emit: (progress: InstallProgress) => {
      emit({ type: 'install-progress', progress });
    },
  });

  const runInstall = async (item: QueuedInstall): Promise<void> => {
    try {
      await installPort(installDeps(), item.portId, item.controller.signal);
      updateResults = updateResults.map((r) =>
        r.portId === item.portId ? { ...r, installedVersion: r.latestVersion, hasUpdate: false } : r,
      );
      item.resolve(ok(null));
    } catch (err) {
      item.resolve(fail(err));
    }
  };

  const pumpInstallQueue = (): void => {
    if (currentInstall) {
      return;
    }
    const next = installQueue.shift();
    if (!next) {
      return;
    }
    currentInstall = next;
    void runInstall(next).finally(() => {
      currentInstall = null;
      pumpInstallQueue();
    });
  };

  const isInstallBusy = (portId: string): boolean =>
    currentInstall?.portId === portId || installQueue.some((item) => item.portId === portId);

  ipcMain.handle('library:get', async (): Promise<IpcResult<LibraryEntry[]>> => {
    try {
      return ok(buildLibrary(libraryDeps()));
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle('catalog:get', async (): Promise<IpcResult<PortConfig[]>> => {
    try {
      return ok(buildCatalog(libraryDeps()));
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle('updates:check', async (_event, force: boolean): Promise<IpcResult<UpdateCheckResponse>> => {
    try {
      updateResults = await checkForUpdates(
        {
          platform: deps.platform,
          db: deps.db,
          getGithubToken: () => deps.settings.getGithubToken(),
        },
        Boolean(force),
      );
      const self = await checkForSelfUpdate(
        {
          platform: deps.platform,
          db: deps.db,
          getGithubToken: () => deps.settings.getGithubToken(),
        },
        app.getVersion(),
        Boolean(force),
      );
      return ok({ ports: updateResults, self });
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle('update:install', async (): Promise<IpcResult<null>> => {
    try {
      await performSelfUpdate({
        platform: deps.platform,
        paths: deps.paths,
        getGithubToken: () => deps.settings.getGithubToken(),
        emit: (progress: SelfUpdateProgress) => {
          emit({ type: 'self-update-progress', progress });
        },
      });
      return ok(null);
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle('install:start', async (_event, portId: string): Promise<IpcResult<null>> => {
    if (isInstallBusy(portId)) {
      return fail(new AppError('INSTALL_BUSY', 'An install for this port is already running'));
    }
    return new Promise((resolve) => {
      installQueue.push({ portId, controller: new AbortController(), resolve });
      if (currentInstall || installQueue.length > 1) {
        emit({
          type: 'install-progress',
          progress: { portId, stage: 'queued', percent: 0, downloadedBytes: 0, totalBytes: 0 },
        });
      }
      pumpInstallQueue();
    });
  });

  ipcMain.handle('install:cancel', async (_event, portId: string): Promise<IpcResult<null>> => {
    if (currentInstall?.portId === portId) {
      currentInstall.controller.abort();
      return ok(null);
    }
    const index = installQueue.findIndex((item) => item.portId === portId);
    if (index >= 0) {
      const [removed] = installQueue.splice(index, 1);
      removed.resolve(fail(new AppError('CANCELLED', 'Install cancelled')));
    }
    return ok(null);
  });

  ipcMain.handle('rom:pick', async (_event, portId: string): Promise<IpcResult<RomStatus>> => {
    try {
      const port = getEntryPort(portId);
      if (!port) {
        return fail(new AppError('UNKNOWN', `Unknown port: ${portId}`));
      }
      const window = deps.getWindow();
      const dialogWindow = window ?? BrowserWindow.getAllWindows()[0];
      const result = await dialog.showOpenDialog(dialogWindow, {
        title: `Select your ${port.displayName} ROM`,
        properties: ['openFile'],
        filters: [
          {
            name: 'ROM files',
            extensions: port.rom.acceptedExtensions.map((ext) => ext.replace('.', '')),
          },
          { name: 'All files', extensions: ['*'] },
        ],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { ok: false, error: { code: 'CANCELLED', message: 'No file selected' } };
      }
      const status = await importRomForPort({ paths: deps.paths, db: deps.db }, port, result.filePaths[0]);
      return ok(status);
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle('rom:status', async (_event, portId: string): Promise<IpcResult<RomStatus>> => {
    try {
      const entry = buildLibrary(libraryDeps()).find((e) => e.port.id === portId);
      if (!entry) {
        return fail(new AppError('UNKNOWN', `Unknown port: ${portId}`));
      }
      return ok(entry.romStatus);
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle('launch:start', async (_event, portId: string): Promise<IpcResult<null>> => {
    try {
      const entry = buildLibrary(libraryDeps()).find((e) => e.port.id === portId);
      if (!entry) {
        return fail(new AppError('UNKNOWN', `Unknown port: ${portId}`));
      }
      await deps.launchManager.launch(entry.port, entry);
      return ok(null);
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle('launch:stop', async (_event, portId: string): Promise<IpcResult<null>> => {
    deps.launchManager.stop(portId);
    return ok(null);
  });

  ipcMain.handle(
    'log:export',
    async (_event, portId: string, content: string): Promise<IpcResult<string | null>> => {
      try {
        const window = deps.getWindow();
        const dialogWindow = window ?? BrowserWindow.getAllWindows()[0];
        const result = await dialog.showSaveDialog(dialogWindow, {
          title: 'Export game output',
          defaultPath: `portyoshka-${portId}.log`,
          filters: [
            { name: 'Log files', extensions: ['log', 'txt'] },
            { name: 'All files', extensions: ['*'] },
          ],
        });
        if (result.canceled || !result.filePath) {
          return ok(null);
        }
        await fs.promises.writeFile(result.filePath, content, 'utf8');
        return ok(result.filePath);
      } catch (err) {
        return fail(err);
      }
    },
  );

  ipcMain.handle('port:showFolder', async (_event, portId: string): Promise<IpcResult<null>> => {    try {
      const installed = deps.db.ports.getInstalled(portId);
      if (!installed) {
        return fail(new AppError('UNKNOWN', 'This port is not installed'));
      }
      if (!fs.existsSync(installed.installPath)) {
        return fail(new AppError('UNKNOWN', `The install folder is missing: ${installed.installPath}`));
      }
      const errorMessage = await shell.openPath(installed.installPath);
      if (errorMessage) {
        return fail(new AppError('UNKNOWN', 'Could not open the folder', errorMessage));
      }
      return ok(null);
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle('port:openRepo', async (_event, portId: string): Promise<IpcResult<null>> => {
    try {
      const port = getEntryPort(portId);
      if (!port) {
        return fail(new AppError('UNKNOWN', `Unknown port: ${portId}`));
      }
      await shell.openExternal(`https://github.com/${port.repo}`);
      return ok(null);
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle('shell:openExternal', async (_event, url: string): Promise<IpcResult<null>> => {
    try {
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        return fail(new AppError('UNKNOWN', 'Invalid link'));
      }
      await shell.openExternal(url);
      return ok(null);
    } catch (err) {
      return fail(err);
    }
  });

  const modsDeps = () => ({ platform: deps.platform, paths: deps.paths });

  const installedPortFor = (portId: string) => {
    const port = getEntryPort(portId);
    const installed = deps.db.ports.getInstalled(portId);
    if (!port) {
      return { error: new AppError('UNKNOWN', `Unknown port: ${portId}`) };
    }
    if (!port.mods) {
      return { error: new AppError('UNKNOWN', 'This port has no mod support') };
    }
    if (!installed) {
      return { error: new AppError('UNKNOWN', 'This port is not installed') };
    }
    return { port, installed };
  };

  ipcMain.handle('mods:get', async (_event, portId: string): Promise<IpcResult<ModCatalog>> => {
    try {
      const { port, installed, error } = installedPortFor(portId);
      if (error || !port || !installed) {
        return fail(error);
      }
      return ok(await getMods(modsDeps(), port, installed));
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle('mods:install', async (_event, portId: string, modId: string): Promise<IpcResult<ModCatalog>> => {
    try {
      const { port, installed, error } = installedPortFor(portId);
      if (error || !port || !installed) {
        return fail(error);
      }
      return ok(await installMod(modsDeps(), port, installed, modId));
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle('mods:uninstall', async (_event, portId: string, modId: string): Promise<IpcResult<ModCatalog>> => {
    try {
      const { port, installed, error } = installedPortFor(portId);
      if (error || !port || !installed) {
        return fail(error);
      }
      return ok(await uninstallMod(modsDeps(), port, installed, modId));
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle(
    'steam:addShortcut',
    async (_event, portId: string, iconData: ArrayBuffer | null): Promise<IpcResult<string>> => {
      try {
        const entry = buildLibrary(libraryDeps()).find((e) => e.port.id === portId);
        if (!entry?.installed) {
          return fail(new AppError('UNKNOWN', 'This port is not installed'));
        }
        let iconPath: string | null = null;
        if (iconData && iconData.byteLength > 0) {
          iconPath = path.join(deps.paths.dataDir, 'icons', `${portId}.png`);
          fs.mkdirSync(path.dirname(iconPath), { recursive: true });
          fs.writeFileSync(iconPath, Buffer.from(iconData));
        }
        const shortcutFile = addSteamShortcut({
          platform: deps.platform,
          getHomeDir: deps.getHomeDir,
          appName: entry.port.displayName,
          exe: entry.installed.executablePath,
          startDir: entry.installed.installPath,
          iconPath,
        });
        return ok(shortcutFile);
      } catch (err) {
        return fail(err);
      }
    },
  );

  ipcMain.handle('steam:removeShortcut', async (_event, portId: string): Promise<IpcResult<null>> => {
    try {
      const entry = buildLibrary(libraryDeps()).find((e) => e.port.id === portId);
      if (!entry?.installed) {
        return fail(new AppError('UNKNOWN', 'This port is not installed'));
      }
      removeSteamShortcut({
        platform: deps.platform,
        getHomeDir: deps.getHomeDir,
        appName: entry.port.displayName,
        exe: entry.installed.executablePath,
      });
      const iconPath = path.join(deps.paths.dataDir, 'icons', `${portId}.png`);
      fs.rmSync(iconPath, { force: true });
      return ok(null);
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle(
    'uninstall:start',
    async (_event, portId: string, keepSettings: boolean): Promise<IpcResult<null>> => {
      try {
        if (deps.launchManager.isRunning(portId)) {
          return fail(new AppError('ALREADY_RUNNING', 'Stop the game before uninstalling it'));
        }
        if (isInstallBusy(portId)) {
          return fail(new AppError('INSTALL_BUSY', 'Wait for the current install to finish first'));
        }
        const port = getEntryPort(portId);
        if (!port) {
          return fail(new AppError('UNKNOWN', `Unknown port: ${portId}`));
        }
        uninstallPort(
          {
            db: deps.db,
            dataDir: deps.paths.dataDir,
            homeDir: deps.getHomeDir(),
            getRootInstallDir: () => deps.settings.getRootInstallDir(),
          },
          port,
          Boolean(keepSettings),
        );
        return ok(null);
      } catch (err) {
        return fail(err);
      }
    },
  );

  const settingsData = (): SettingsData => ({ ...deps.settings.get(), version: app.getVersion() });

  ipcMain.handle('settings:get', async (): Promise<IpcResult<SettingsData>> => {
    try {
      return ok(settingsData());
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle('settings:set', async (_event, patch): Promise<IpcResult<SettingsData>> => {
    try {
      deps.settings.set(patch);
      return ok(settingsData());
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle(
    'settings:setPortDirOverride',
    async (_event, portId: string, dir: string | null): Promise<IpcResult<SettingsData>> => {
      try {
        deps.settings.setPortDirOverride(portId, dir);
        return ok(settingsData());
      } catch (err) {
        return fail(err);
      }
    },
  );

  ipcMain.handle('dialog:pickDirectory', async (): Promise<IpcResult<string | null>> => {
    const window = deps.getWindow();
    const dialogWindow = window ?? BrowserWindow.getAllWindows()[0];
    const result = await dialog.showOpenDialog(dialogWindow, {
      title: 'Choose a folder',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return ok(null);
    }
    return ok(result.filePaths[0]);
  });

  ipcMain.handle('window:minimize', async (): Promise<IpcResult<null>> => {
    deps.getWindow()?.minimize();
    return ok(null);
  });

  ipcMain.handle('window:toggleMaximize', async (): Promise<IpcResult<null>> => {
    const window = deps.getWindow();
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }
    return ok(null);
  });

  ipcMain.handle('window:close', async (): Promise<IpcResult<null>> => {
    deps.getWindow()?.close();
    return ok(null);
  });

  ipcMain.handle('window:isMaximized', async (): Promise<IpcResult<boolean>> => {
    return ok(deps.getWindow()?.isMaximized() ?? false);
  });
}
