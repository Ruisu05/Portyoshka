import path from 'node:path';
import fs from 'node:fs';

export interface AppPaths {
  dataDir: string;
  romsDir: string;
  tmpDir: string;
  dbFile: string;
}

export function createPaths(dataDir: string): AppPaths {
  const romsDir = path.join(dataDir, 'roms');
  const tmpDir = path.join(dataDir, 'tmp');
  fs.mkdirSync(romsDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  return {
    dataDir,
    romsDir,
    tmpDir,
    dbFile: path.join(dataDir, 'portyoshka.db'),
  };
}
