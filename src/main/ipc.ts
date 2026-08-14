import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import fs from 'node:fs';
import type { DatabaseBundle } from './db';
import type { AppPaths } from './paths';
import type { LaunchManager } from './services/launcher';
import type { SettingsStore } from './services/settings';
import { installPort } from './services/installer';
import { importRomForPort } from './services/romLibrary';
import { checkForUpdates } from './services/updater';
import { buildLibrary, buildCatalog, getEntryPort } from './services/library';
import { uninstallPort } from './services/uninstall';
import { AppError, asAppError } from './services/errors';
import type {
  IpcResult,
  InstallProgress,
  LibraryEntry,
  MainEvent,
  Platform,
  PortConfig,
  RomStatus,
  SettingsData,
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

export function registerIpc(deps: IpcDeps): void {
  const installs = new Map<string, AbortController>();
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
  });

  const ok = <T,>(data: T): IpcResult<T> => ({ ok: true, data });
  const fail = <T,>(err: unknown): IpcResult<T> => {
    const appErr = asAppError(err, 'UNKNOWN', 'Something went wrong');
    return { ok: false, error: { code: appErr.code, message: appErr.message, detail: appErr.detail } };
  };

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

  ipcMain.handle('updates:check', async (_event, force: boolean): Promise<IpcResult<UpdateCheckResult[]>> => {
    try {
      updateResults = await checkForUpdates(
        {
          platform: deps.platform,
          db: deps.db,
          getGithubToken: () => deps.settings.getGithubToken(),
        },
        Boolean(force),
      );
      return ok(updateResults);
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle('install:start', async (_event, portId: string): Promise<IpcResult<null>> => {
    if (installs.has(portId)) {
      return fail(new AppError('INSTALL_BUSY', 'An install for this port is already running'));
    }
    const controller = new AbortController();
    installs.set(portId, controller);
    const onProgress = (progress: InstallProgress) => {
      emit({ type: 'install-progress', progress });
    };
    try {
      await installPort(
        {
          platform: deps.platform,
          paths: deps.paths,
          db: deps.db,
          getRootInstallDir: () => deps.settings.getRootInstallDir(),
          getPortDirOverride: (id) => deps.settings.getPortDirOverride(id),
          getGithubToken: () => deps.settings.getGithubToken(),
          emit: onProgress,
        },
        portId,
        controller.signal,
      );
      updateResults = updateResults.map((r) =>
        r.portId === portId ? { ...r, installedVersion: r.latestVersion, hasUpdate: false } : r,
      );
      return ok(null);
    } catch (err) {
      return fail(err);
    } finally {
      installs.delete(portId);
    }
  });

  ipcMain.handle('install:cancel', async (_event, portId: string): Promise<IpcResult<null>> => {
    installs.get(portId)?.abort();
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

  ipcMain.handle(
    'uninstall:start',
    async (_event, portId: string, keepSettings: boolean): Promise<IpcResult<null>> => {
      try {
        if (deps.launchManager.isRunning(portId)) {
          return fail(new AppError('ALREADY_RUNNING', 'Stop the game before uninstalling it'));
        }
        if (installs.has(portId)) {
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

  ipcMain.handle('settings:get', async (): Promise<IpcResult<SettingsData>> => {
    try {
      return ok(deps.settings.get());
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle('settings:set', async (_event, patch): Promise<IpcResult<SettingsData>> => {
    try {
      return ok(deps.settings.set(patch));
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle(
    'settings:setPortDirOverride',
    async (_event, portId: string, dir: string | null): Promise<IpcResult<SettingsData>> => {
      try {
        return ok(deps.settings.setPortDirOverride(portId, dir));
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
}
