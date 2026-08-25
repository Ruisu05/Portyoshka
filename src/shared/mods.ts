import type { ModIndexEntry, ModInfo } from './types';

export function semverCompare(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

export function latestVersionFor(entry: ModIndexEntry): string | null {
  return entry.latest?.version ?? entry.version ?? null;
}

export function hasModUpdate(entry: ModInfo): boolean {
  if (entry.updatedAt && entry.installedUpdatedAt) {
    return entry.updatedAt > entry.installedUpdatedAt;
  }
  if (!entry.installedVersion) {
    return false;
  }
  const latest = latestVersionFor(entry);
  if (!latest) {
    return false;
  }
  return semverCompare(latest, entry.installedVersion) > 0;
}
