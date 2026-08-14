import fs from 'node:fs';
import path from 'node:path';
import { AppError } from './errors';
import { collectUserFiles } from './userFiles';
import type { DatabaseBundle } from '../db';
import type { PortConfig } from '../../shared/types';

export interface UninstallDeps {
  db: DatabaseBundle;
  dataDir: string;
  homeDir: string;
  getRootInstallDir: () => string;
}

export function uninstallPort(deps: UninstallDeps, port: PortConfig, keepSettings: boolean): void {
  const installed = deps.db.ports.getInstalled(port.id);
  if (!installed) {
    throw new AppError('UNKNOWN', `${port.displayName} is not installed`);
  }
  const installDir = path.resolve(installed.installPath);
  const protectedDirs = [path.resolve(deps.getRootInstallDir()), path.resolve(deps.homeDir), path.resolve(deps.dataDir)];
  if (protectedDirs.includes(installDir)) {
    throw new AppError(
      'UNKNOWN',
      `Refusing to delete ${installDir} — it is a protected directory. Reset the port\u2019s directory override in Settings first.`,
    );
  }
  if (!fs.existsSync(installDir)) {
    deps.db.ports.removeInstalled(port.id);
    deps.db.roms.unlinkPortRom(port.id);
    return;
  }

  if (keepSettings && port.preserveOnUpdate.length > 0) {
    const backupDir = path.join(deps.dataDir, 'backups', port.id, `${installed.version}-${Date.now()}`);
    for (const rel of collectUserFiles(installDir, port.preserveOnUpdate)) {
      const source = path.join(installDir, rel);
      const target = path.join(backupDir, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
    }
  } else {
    fs.rmSync(path.join(deps.dataDir, 'backups', port.id), { recursive: true, force: true });
  }

  fs.rmSync(installDir, { recursive: true, force: true });
  deps.db.ports.removeInstalled(port.id);
  deps.db.roms.unlinkPortRom(port.id);
}
