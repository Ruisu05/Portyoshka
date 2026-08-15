import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { SettingsRepo, createSettingsRepo } from './settingsRepo';
import { PortsRepo, createPortsRepo } from './portsRepo';
import { RomsRepo, createRomsRepo } from './romsRepo';
import { PlaytimeRepo, createPlaytimeRepo } from './playtimeRepo';

export interface DatabaseBundle {
  settings: SettingsRepo;
  ports: PortsRepo;
  roms: RomsRepo;
  playtime: PlaytimeRepo;
  close(): void;
}

const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS ports (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    install_path TEXT NOT NULL,
    executable_path TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS roms (
    sha1 TEXT PRIMARY KEY,
    md5 TEXT NOT NULL,
    source_path TEXT NOT NULL,
    cached_path TEXT NOT NULL,
    extension TEXT NOT NULL,
    size INTEGER NOT NULL,
    validated_at INTEGER NOT NULL
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS port_roms (
    port_id TEXT PRIMARY KEY,
    rom_sha1 TEXT NOT NULL REFERENCES roms(sha1)
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS playtime (
    port_id TEXT PRIMARY KEY,
    total_ms INTEGER NOT NULL DEFAULT 0,
    last_played_at INTEGER NOT NULL DEFAULT 0
  );
  `,
];

export function openDatabase(dbFile: string): DatabaseBundle {
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  const raw = new DatabaseSync(dbFile);
  raw.exec('PRAGMA journal_mode = WAL;');
  raw.exec('PRAGMA foreign_keys = ON;');
  for (const migration of MIGRATIONS) {
    raw.exec(migration);
  }
  return {
    settings: createSettingsRepo(raw),
    ports: createPortsRepo(raw),
    roms: createRomsRepo(raw),
    playtime: createPlaytimeRepo(raw),
    close: () => raw.close(),
  };
}
