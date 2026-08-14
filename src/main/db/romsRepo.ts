import type { DatabaseSync } from 'node:sqlite';
import type { RomRecord } from '../../shared/types';

export interface RomsRepo {
  getBySha1(sha1: string): RomRecord | null;
  insert(rom: RomRecord): void;
  linkPortRom(portId: string, sha1: string): void;
  getLinkedRom(portId: string): RomRecord | null;
  unlinkPortRom(portId: string): void;
}

interface Row {
  sha1: string;
  md5: string;
  source_path: string;
  cached_path: string;
  extension: string;
  size: number;
  validated_at: number;
}

function toRomRecord(row: Row): RomRecord {
  return {
    sha1: row.sha1,
    md5: row.md5,
    sourcePath: row.source_path,
    cachedPath: row.cached_path,
    extension: row.extension,
    size: row.size,
    validatedAt: row.validated_at,
  };
}

export function createRomsRepo(db: DatabaseSync): RomsRepo {
  const getBySha1Stmt = db.prepare('SELECT * FROM roms WHERE sha1 = ?');
  const insertStmt = db.prepare(
    `INSERT OR IGNORE INTO roms (sha1, md5, source_path, cached_path, extension, size, validated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const linkStmt = db.prepare(
    `INSERT INTO port_roms (port_id, rom_sha1) VALUES (?, ?)
     ON CONFLICT(port_id) DO UPDATE SET rom_sha1 = excluded.rom_sha1`,
  );
  const getLinkedStmt = db.prepare(
    `SELECT r.* FROM roms r JOIN port_roms pr ON pr.rom_sha1 = r.sha1 WHERE pr.port_id = ?`,
  );
  const unlinkStmt = db.prepare('DELETE FROM port_roms WHERE port_id = ?');

  return {
    getBySha1(sha1) {
      const row = getBySha1Stmt.get(sha1) as Row | undefined;
      return row ? toRomRecord(row) : null;
    },
    insert(rom) {
      insertStmt.run(
        rom.sha1,
        rom.md5,
        rom.sourcePath,
        rom.cachedPath,
        rom.extension,
        rom.size,
        rom.validatedAt,
      );
    },
    linkPortRom(portId, sha1) {
      linkStmt.run(portId, sha1);
    },
    getLinkedRom(portId) {
      const row = getLinkedStmt.get(portId) as Row | undefined;
      return row ? toRomRecord(row) : null;
    },
    unlinkPortRom(portId) {
      unlinkStmt.run(portId);
    },
  };
}
