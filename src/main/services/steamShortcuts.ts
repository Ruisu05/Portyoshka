import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as shortcutEditor from 'steam-shortcut-editor';
import type { SteamShortcutsData } from 'steam-shortcut-editor';
import { AppError } from './errors';
import type { Platform } from '../../shared/types';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(input: string): number {
  let crc = 0xffffffff;
  for (let i = 0; i < input.length; i += 1) {
    crc = CRC_TABLE[(crc ^ input.charCodeAt(i)) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function shortcutAppId(exe: string, appName: string): number {
  return crc32(exe + appName) | 0x80000000;
}

export function steamShortcutAppId(exe: string, appName: string): number {
  return shortcutAppId(exe, appName);
}

function steamUserdataDir(platform: Platform, homeDir: string): string | null {
  const candidates: string[] = [];
  if (platform === 'windows') {
    try {
      const raw = execFileSync('reg', [
        'query',
        'HKCU\\Software\\Valve\\Steam',
        '/v',
        'SteamPath',
      ]).toString();
      const match = raw.match(/REG_SZ\s+(\S.*)/);
      if (match) {
        candidates.push(path.join(match[1].trim(), 'userdata'));
      }
    } catch {
      // registry key missing; Steam not installed
    }
  } else if (platform === 'linux') {
    candidates.push(
      path.join(homeDir, '.local', 'share', 'Steam', 'userdata'),
      path.join(homeDir, '.var', 'app', 'com.valvesoftware.Steam', '.local', 'share', 'Steam', 'userdata'),
    );
  } else {
    candidates.push(path.join(homeDir, 'Library', 'Application Support', 'Steam', 'userdata'));
  }
  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }
  return null;
}

function pickAccountDir(userdataDir: string): string {
  const entries = fs
    .readdirSync(userdataDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d+$/.test(e.name) && e.name !== '0')
    .map((e) => {
      const full = path.join(userdataDir, e.name);
      let mtimeMs = 0;
      try {
        mtimeMs = fs.statSync(full).mtimeMs;
      } catch {
        // unreadable; keep 0
      }
      return { name: e.name, mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (entries.length === 0) {
    throw new AppError('STEAM_NOT_FOUND', 'No Steam user account found. Sign in to Steam once first.');
  }
  return path.join(userdataDir, entries[0].name, 'config');
}

function isSteamRunning(platform: Platform): boolean {
  try {
    if (platform === 'windows') {
      return execFileSync('tasklist').toString().toLowerCase().includes('steam.exe');
    }
    if (platform === 'linux') {
      for (const name of fs.readdirSync('/proc')) {
        if (!/^\d+$/.test(name)) {
          continue;
        }
        try {
          if (fs.readFileSync(`/proc/${name}/comm`, 'utf8').trim() === 'steam') {
            return true;
          }
        } catch {
          // gone
        }
      }
    }
  } catch {
    // detection is best-effort
  }
  return false;
}

function quoteIfNeeded(value: string): string {
  return /\s/.test(value) ? `"${value}"` : value;
}

export interface AddSteamShortcutInput {
  platform: Platform;
  getHomeDir: () => string;
  appName: string;
  exe: string;
  startDir: string;
  iconPath: string | null;
}

export interface RemoveSteamShortcutInput {
  platform: Platform;
  getHomeDir: () => string;
  appName: string;
  exe: string;
}

function resolveShortcutsFile(platform: Platform, homeDir: string): { filePath: string; exists: boolean } | null {
  const userdataDir = steamUserdataDir(platform, homeDir);
  if (!userdataDir) {
    return null;
  }
  const configDir = pickAccountDir(userdataDir);
  const filePath = path.join(configDir, 'shortcuts.vdf');
  return { filePath, exists: fs.existsSync(filePath) };
}

function readShortcuts(filePath: string): SteamShortcutsData {
  return shortcutEditor.parseBuffer(fs.readFileSync(filePath));
}

function writeShortcuts(filePath: string, data: SteamShortcutsData): void {
  fs.writeFileSync(filePath, shortcutEditor.writeBuffer(data));
}

function findIndexByAppId(data: SteamShortcutsData, appId: number): number {
  return data.shortcuts.findIndex((s) => s.appid === appId);
}

export function listSteamShortcutAppIds(platform: Platform, homeDir: string): Set<number> {
  const ids = new Set<number>();
  try {
    const resolved = resolveShortcutsFile(platform, homeDir);
    if (!resolved || !resolved.exists) {
      return ids;
    }
    for (const shortcut of readShortcuts(resolved.filePath).shortcuts) {
      if (typeof shortcut.appid === 'number') {
        ids.add(shortcut.appid);
      }
    }
  } catch {
    // best effort; treat as no shortcuts
  }
  return ids;
}

export function addSteamShortcut(input: AddSteamShortcutInput): string {
  if (isSteamRunning(input.platform)) {
    throw new AppError(
      'STEAM_RUNNING',
      'Steam is running. Quit Steam first — it overwrites shortcuts.vdf on exit.',
    );
  }
  const resolved = resolveShortcutsFile(input.platform, input.getHomeDir());
  if (!resolved) {
    throw new AppError(
      'STEAM_NOT_FOUND',
      'Steam installation not found. Install Steam and sign in once first.',
    );
  }
  fs.mkdirSync(path.dirname(resolved.filePath), { recursive: true });
  const data = resolved.exists ? readShortcuts(resolved.filePath) : { shortcuts: [] };

  const appId = shortcutAppId(input.exe, input.appName);
  if (findIndexByAppId(data, appId) !== -1) {
    throw new AppError('ALREADY_EXISTS', `${input.appName} is already in your Steam library.`);
  }

  data.shortcuts.push({
    appid: appId,
    AppName: input.appName,
    exe: quoteIfNeeded(input.exe),
    StartDir: quoteIfNeeded(input.startDir),
    icon: input.iconPath ? quoteIfNeeded(input.iconPath) : '',
    ShortcutPath: '',
    LaunchOptions: '',
    IsHidden: false,
    AllowDesktopConfig: true,
    AllowOverlay: true,
    OpenVR: false,
    Devkit: false,
    DevkitGameID: '',
    DevkitOverrideAppID: 0,
    LastPlayTime: 0,
    tags: [],
  });

  if (resolved.exists) {
    fs.copyFileSync(resolved.filePath, `${resolved.filePath}.bak`);
  }
  writeShortcuts(resolved.filePath, data);
  return resolved.filePath;
}

export function removeSteamShortcut(input: RemoveSteamShortcutInput): void {
  if (isSteamRunning(input.platform)) {
    throw new AppError(
      'STEAM_RUNNING',
      'Steam is running. Quit Steam first — it overwrites shortcuts.vdf on exit.',
    );
  }
  const resolved = resolveShortcutsFile(input.platform, input.getHomeDir());
  if (!resolved || !resolved.exists) {
    return;
  }
  const data = readShortcuts(resolved.filePath);
  const appId = shortcutAppId(input.exe, input.appName);
  const index = findIndexByAppId(data, appId);
  if (index === -1) {
    return;
  }
  data.shortcuts.splice(index, 1);
  fs.copyFileSync(resolved.filePath, `${resolved.filePath}.bak`);
  writeShortcuts(resolved.filePath, data);
}
