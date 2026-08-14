import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { createPaths } from './paths';
import { openDatabase } from './db';
import { LaunchManager } from './services/launcher';
import { createSettingsStore, defaultInstallDir } from './services/settings';
import { registerIpc } from './ipc';
import type { Platform } from '../shared/types';

if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    backgroundColor: '#0f1318',
    title: 'Portyoshka',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

app.on('ready', () => {
  const paths = createPaths(app.getPath('userData'));
  const db = openDatabase(paths.dbFile);
  const settings = createSettingsStore(db, defaultInstallDir(app.getPath('home')));
  const platform: Platform =
    process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';

  const launchManager = new LaunchManager({
    platform,
    paths,
    db,
    emit: (event) => {
      mainWindow?.webContents.send('portyoshka:event', event);
    },
  });

  registerIpc({
    platform,
    paths,
    db,
    launchManager,
    settings,
    getWindow: () => mainWindow,
    getHomeDir: () => app.getPath('home'),
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
