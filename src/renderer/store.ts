import { create } from 'zustand';
import { api } from './api';
import type {
  AppErrorInfo,
  InstallProgress,
  LibraryEntry,
  PortConfig,
  SettingsData,
  UpdateCheckResult,
} from '../shared/types';

export interface LogLine {
  stream: 'stdout' | 'stderr';
  data: string;
}

export interface ToastItem {
  id: string;
  kind: 'error' | 'success';
  message: string;
  detail?: string;
  code?: string;
}

interface AppState {
  view: 'library' | 'catalog';
  library: LibraryEntry[];
  catalog: PortConfig[];
  installs: Record<string, InstallProgress>;
  busyInstalls: Record<string, boolean>;
  updateInfo: UpdateCheckResult[];
  checkingUpdates: boolean;
  settings: SettingsData | null;
  logs: Record<string, LogLine[]>;
  lastExit: Record<string, { code: number | null; signal: string | null; failed: boolean }>;
  errors: ToastItem[];
  romPrompt: { portId: string; autoLaunch: boolean } | null;
  uninstallPrompt: string | null;
  updateDialogOpen: boolean;
  settingsDialogOpen: boolean;
  init(): Promise<void>;
  refresh(): Promise<void>;
  setView(view: 'library' | 'catalog'): void;
  checkUpdates(force: boolean): Promise<void>;
  install(portId: string): Promise<void>;
  cancelInstall(portId: string): Promise<void>;
  attachRom(portId: string): Promise<boolean>;
  launch(portId: string): Promise<void>;
  stopLaunch(portId: string): Promise<void>;
  openRomPrompt(portId: string, autoLaunch: boolean): void;
  closeRomPrompt(): void;
  openUninstallPrompt(portId: string): void;
  closeUninstallPrompt(): void;
  uninstall(portId: string, keepSettings: boolean): Promise<void>;
  showFolder(portId: string): Promise<void>;
  openRepo(portId: string): Promise<void>;
  setUpdateDialogOpen(open: boolean): void;
  setSettingsDialogOpen(open: boolean): void;
  saveSettings(patch: Partial<Pick<SettingsData, 'rootInstallDir' | 'githubToken'>>): Promise<void>;
  setPortDirOverride(portId: string, dir: string | null): Promise<void>;
  pickDirectory(): Promise<string | null>;
  pushError(error: AppErrorInfo): void;
  pushSuccess(message: string): void;
  dismissError(index: number): void;
  exportLog(portId: string): Promise<void>;
  toggleLog(portId: string): void;
  visibleLogs: Record<string, boolean>;
}

export const useStore = create<AppState>()((set, get) => ({
  view: 'library',
  library: [],
  catalog: [],
  installs: {},
  busyInstalls: {},
  updateInfo: [],
  checkingUpdates: false,
  settings: null,
  logs: {},
  lastExit: {},
  errors: [],
  romPrompt: null,
  uninstallPrompt: null,
  updateDialogOpen: false,
  settingsDialogOpen: false,
  visibleLogs: {},

  async init() {
    api.onEvent((event) => {
      if (event.type === 'install-progress') {
        set((state) => {
          const installs = { ...state.installs, [event.progress.portId]: event.progress };
          const busyInstalls = { ...state.busyInstalls };
          if (event.progress.stage === 'done' || event.progress.stage === 'cancelled') {
            delete busyInstalls[event.progress.portId];
          }
          return { installs, busyInstalls };
        });
        if (event.progress.stage === 'done' || event.progress.stage === 'cancelled') {
          void get().refresh();
        }
      } else if (event.type === 'launch-output') {
        set((state) => ({
          logs: {
            ...state.logs,
            [event.portId]: [...(state.logs[event.portId] ?? []), { stream: event.stream, data: event.data }],
          },
        }));
      } else if (event.type === 'launch-exit') {
        set((state) => ({
          lastExit: {
            ...state.lastExit,
            [event.portId]: { code: event.code, signal: event.signal, failed: event.failed },
          },
        }));
        if (event.failed) {
          const name =
            get().library.find((l) => l.port.id === event.portId)?.port.displayName ?? event.portId;
          const how = event.signal
            ? `was killed by ${event.signal}`
            : `exited with code ${event.code ?? 'unknown'}`;
          get().pushError({
            code: 'LAUNCH_FAILED',
            message: `${name} ${how}. Open "Output" on the card for details.`,
          });
        }
        void get().refresh();
      } else if (event.type === 'launch-restarted') {
        set((state) => ({
          logs: {
            ...state.logs,
            [event.portId]: [...(state.logs[event.portId] ?? []), { stream: 'stdout', data: 'Restarting without FUSE…\n' }],
          },
        }));
      }
    });

    const [library, catalog, settings, updates] = await Promise.all([
      api.getLibrary(),
      api.getCatalog(),
      api.getSettings(),
      api.checkForUpdates(false),
    ]);
    if (library.ok) set({ library: library.data });
    if (catalog.ok) set({ catalog: catalog.data });
    if (settings.ok) set({ settings: settings.data });
    if (updates.ok) {
      set({ updateInfo: updates.data });
      const hasUpdate = updates.data.some((u) => u.hasUpdate && !u.error);
      if (hasUpdate) {
        set({ updateDialogOpen: true });
      }
    }
    for (const result of [library, catalog, settings, updates]) {
      if (!result.ok) get().pushError(result.error);
    }

    setInterval(() => {
      const anyRunning = get().library.some((l) => l.running);
      if (anyRunning) {
        void get().refresh();
      }
    }, 8000);
  },

  async refresh() {
    const [library, catalog] = await Promise.all([api.getLibrary(), api.getCatalog()]);
    if (library.ok) set({ library: library.data });
    if (catalog.ok) set({ catalog: catalog.data });
    for (const result of [library, catalog]) {
      if (!result.ok) get().pushError(result.error);
    }
  },

  setView(view) {
    set({ view });
    if (view === 'catalog') {
      void get().refresh();
    }
  },

  async checkUpdates(force) {
    set({ checkingUpdates: true });
    const result = await api.checkForUpdates(force);
    set({ checkingUpdates: false });
    if (result.ok) {
      set({ updateInfo: result.data });
      const hasUpdate = result.data.some((u) => u.hasUpdate && !u.error);
      if (hasUpdate && force) {
        set({ updateDialogOpen: true });
      }
    } else {
      get().pushError(result.error);
    }
  },

  async install(portId) {
    set((state) => ({ busyInstalls: { ...state.busyInstalls, [portId]: true } }));
    const result = await api.startInstall(portId);
    if (!result.ok) {
      set((state) => {
        const busyInstalls = { ...state.busyInstalls };
        delete busyInstalls[portId];
        return { busyInstalls };
      });
      get().pushError(result.error);
    }
  },

  async cancelInstall(portId) {
    await api.cancelInstall(portId);
  },

  async attachRom(portId) {
    const result = await api.pickRom(portId);
    if (result.ok) {
      set({ romPrompt: null });
      await get().refresh();
      return true;
    }
    if (result.error.code !== 'CANCELLED') {
      get().pushError(result.error);
    }
    return false;
  },

  async launch(portId) {
    const result = await api.launch(portId);
    if (result.ok) {
      set((state) => ({
        logs: { ...state.logs, [portId]: [] },
        lastExit: {
          ...state.lastExit,
          [portId]: { code: null, signal: null, failed: false },
        },
      }));
      await get().refresh();
      return;
    }
    if (result.error.code === 'ROM_NOT_ATTACHED') {
      set({ romPrompt: { portId, autoLaunch: true } });
      return;
    }
    get().pushError(result.error);
  },

  async stopLaunch(portId) {
    await api.stopLaunch(portId);
  },

  openRomPrompt(portId, autoLaunch) {
    set({ romPrompt: { portId, autoLaunch } });
  },

  closeRomPrompt() {
    set({ romPrompt: null });
  },

  openUninstallPrompt(portId) {
    set({ uninstallPrompt: portId });
  },

  closeUninstallPrompt() {
    set({ uninstallPrompt: null });
  },

  async uninstall(portId, keepSettings) {
    const result = await api.uninstall(portId, keepSettings);
    if (result.ok) {
      set({ uninstallPrompt: null });
      await get().refresh();
    } else {
      get().pushError(result.error);
    }
  },

  async showFolder(portId) {
    const result = await api.showFolder(portId);
    if (!result.ok) {
      get().pushError(result.error);
    }
  },

  async openRepo(portId) {
    const result = await api.openRepo(portId);
    if (!result.ok) {
      get().pushError(result.error);
    }
  },

  setUpdateDialogOpen(open) {
    set({ updateDialogOpen: open });
  },

  setSettingsDialogOpen(open) {
    set({ settingsDialogOpen: open });
  },

  async saveSettings(patch) {
    const result = await api.setSettings(patch);
    if (result.ok) {
      set({ settings: result.data });
    } else {
      get().pushError(result.error);
    }
  },

  async setPortDirOverride(portId, dir) {
    const result = await api.setPortDirOverride(portId, dir);
    if (result.ok) {
      set({ settings: result.data });
    } else {
      get().pushError(result.error);
    }
  },

  async pickDirectory() {
    const result = await api.pickDirectory();
    if (result.ok) {
      return result.data;
    }
    get().pushError(result.error);
    return null;
  },

  pushError(error) {
    const id = `${Date.now()}-${Math.random()}`;
    set((state) => ({
      errors: [
        ...state.errors,
        { message: error.message, detail: error.detail, code: error.code, id, kind: 'error' as const },
      ],
    }));
    setTimeout(() => {
      set((state) => ({ errors: state.errors.filter((e) => e.id !== id) }));
    }, 9000);
  },

  pushSuccess(message) {
    const id = `${Date.now()}-${Math.random()}`;
    set((state) => ({
      errors: [...state.errors, { message, id, kind: 'success' as const }],
    }));
    setTimeout(() => {
      set((state) => ({ errors: state.errors.filter((e) => e.id !== id) }));
    }, 6000);
  },

  async exportLog(portId) {
    const lines = get().logs[portId] ?? [];
    const exit = get().lastExit[portId];
    let content = lines.map((l) => l.data).join('');
    if (!content.endsWith('\n')) {
      content += '\n';
    }
    if (exit) {
      const how = exit.signal
        ? `killed by ${exit.signal}`
        : `exited with code ${exit.code ?? 'unknown'}`;
      content += `\n[process ${how}]\n`;
    }
    const result = await api.exportLog(portId, content);
    if (result.ok) {
      if (result.data) {
        get().pushSuccess(`Log saved to ${result.data}`);
      }
    } else {
      get().pushError(result.error);
    }
  },

  dismissError(index) {
    set((state) => ({ errors: state.errors.filter((_, i) => i !== index) }));
  },

  toggleLog(portId) {
    set((state) => ({
      visibleLogs: { ...state.visibleLogs, [portId]: !(state.visibleLogs[portId] ?? false) },
    }));
  },
}));
