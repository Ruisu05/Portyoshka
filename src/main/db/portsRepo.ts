import type { DatabaseSync } from 'node:sqlite';
import type { InstalledPort } from '../../shared/types';

export interface PortsRepo {
  upsertInstalled(port: InstalledPort): void;
  getInstalled(id: string): InstalledPort | null;
  listInstalled(): InstalledPort[];
  removeInstalled(id: string): void;
}

interface Row {
  id: string;
  version: string;
  install_path: string;
  executable_path: string;
  updated_at: number;
}

function toInstalledPort(row: Row): InstalledPort {
  return {
    id: row.id,
    version: row.version,
    installPath: row.install_path,
    executablePath: row.executable_path,
    updatedAt: row.updated_at,
  };
}

export function createPortsRepo(db: DatabaseSync): PortsRepo {
  const upsert = db.prepare(
    `INSERT INTO ports (id, version, install_path, executable_path, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       version = excluded.version,
       install_path = excluded.install_path,
       executable_path = excluded.executable_path,
       updated_at = excluded.updated_at`,
  );
  const get = db.prepare('SELECT * FROM ports WHERE id = ?');
  const list = db.prepare('SELECT * FROM ports ORDER BY id');
  const remove = db.prepare('DELETE FROM ports WHERE id = ?');

  return {
    upsertInstalled(port) {
      upsert.run(port.id, port.version, port.installPath, port.executablePath, port.updatedAt);
    },
    getInstalled(id) {
      const row = get.get(id) as Row | undefined;
      return row ? toInstalledPort(row) : null;
    },
    listInstalled() {
      return (list.all() as unknown as Row[]).map(toInstalledPort);
    },
    removeInstalled(id) {
      remove.run(id);
    },
  };
}
