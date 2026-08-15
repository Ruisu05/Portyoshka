import type { DatabaseSync } from 'node:sqlite';

export interface PlaytimeStats {
  totalMs: number;
  lastPlayedAt: number;
}

export interface PlaytimeRepo {
  get(portId: string): PlaytimeStats;
  addSession(portId: string, ms: number): void;
}

export function createPlaytimeRepo(raw: DatabaseSync): PlaytimeRepo {
  return {
    get(portId: string): PlaytimeStats {
      const row = raw
        .prepare('SELECT total_ms, last_played_at FROM playtime WHERE port_id = ?')
        .get(portId) as { total_ms: number; last_played_at: number } | undefined;
      if (!row) {
        return { totalMs: 0, lastPlayedAt: 0 };
      }
      return { totalMs: row.total_ms, lastPlayedAt: row.last_played_at };
    },
    addSession(portId: string, ms: number): void {
      const now = Date.now();
      raw
        .prepare(
          `INSERT INTO playtime (port_id, total_ms, last_played_at) VALUES (?, ?, ?)
           ON CONFLICT(port_id) DO UPDATE SET
             total_ms = total_ms + excluded.total_ms,
             last_played_at = excluded.last_played_at`,
        )
        .run(portId, ms, now);
    },
  };
}
