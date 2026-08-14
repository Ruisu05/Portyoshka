import type { DatabaseSync } from 'node:sqlite';

export interface SettingsRepo {
  get(key: string): string | null;
  set(key: string, value: string): void;
  listByPrefix(prefix: string): Array<{ key: string; value: string }>;
  getJson<T>(key: string): T | null;
  setJson<T>(key: string, value: T): void;
}

export function createSettingsRepo(db: DatabaseSync): SettingsRepo {
  const getStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const listStmt = db.prepare('SELECT key, value FROM settings WHERE key LIKE ?');
  const setStmt = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  );
  return {
    get(key: string) {
      const row = getStmt.get(key) as { value: string } | undefined;
      return row ? row.value : null;
    },
    set(key: string, value: string) {
      setStmt.run(key, value);
    },
    listByPrefix(prefix: string) {
      return listStmt.all(`${prefix}%`) as Array<{ key: string; value: string }>;
    },
    getJson<T>(key: string): T | null {
      const raw = this.get(key);
      if (raw === null) {
        return null;
      }
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    setJson<T>(key: string, value: T): void {
      this.set(key, JSON.stringify(value));
    },
  };
}
