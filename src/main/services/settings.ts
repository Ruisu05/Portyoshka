import path from 'node:path';
import type { DatabaseBundle } from '../db';
import type { SettingsData } from '../../shared/types';

export interface SettingsStore {
  get(): SettingsData;
  set(patch: Partial<Pick<SettingsData, 'rootInstallDir' | 'githubToken'>>): SettingsData;
  setPortDirOverride(portId: string, dir: string | null): SettingsData;
  listOverrides(): Record<string, string>;
  getPortDirOverride(portId: string): string | null;
  getRootInstallDir(): string;
  getGithubToken(): string | null;
}

const KEY_ROOT = 'rootInstallDir';
const KEY_TOKEN = 'githubToken';
const KEY_OVERRIDE_PREFIX = 'portDir:';

export function createSettingsStore(db: DatabaseBundle, defaultRootInstallDir: string): SettingsStore {
  return {
    get() {
      return {
        rootInstallDir: db.settings.get(KEY_ROOT) ?? defaultRootInstallDir,
        githubToken: db.settings.get(KEY_TOKEN) ?? '',
        portDirOverrides: this.listOverrides(),
      };
    },
    listOverrides() {
      const overrides: Record<string, string> = {};
      for (const { key, value } of db.settings.listByPrefix(KEY_OVERRIDE_PREFIX)) {
        if (value.length > 0) {
          overrides[key.slice(KEY_OVERRIDE_PREFIX.length)] = value;
        }
      }
      return overrides;
    },
    set(patch) {
      const current = this.get();
      const next: SettingsData = {
        ...current,
        ...patch,
      };
      if (patch.rootInstallDir !== undefined) {
        db.settings.set(KEY_ROOT, patch.rootInstallDir);
      }
      if (patch.githubToken !== undefined) {
        db.settings.set(KEY_TOKEN, patch.githubToken);
      }
      return next;
    },
    setPortDirOverride(portId, dir) {
      const key = `${KEY_OVERRIDE_PREFIX}${portId}`;
      if (dir) {
        db.settings.set(key, dir);
      } else {
        db.settings.set(key, '');
      }
      return this.get();
    },
    getPortDirOverride(portId) {
      const value = db.settings.get(`${KEY_OVERRIDE_PREFIX}${portId}`);
      return value && value.length > 0 ? value : null;
    },
    getRootInstallDir() {
      return db.settings.get(KEY_ROOT) ?? defaultRootInstallDir;
    },
    getGithubToken() {
      const token = db.settings.get(KEY_TOKEN);
      return token && token.length > 0 ? token : null;
    },
  };
}

export function defaultInstallDir(homeDir: string): string {
  return path.join(homeDir, 'Portyoshka');
}
