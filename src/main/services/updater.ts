import { AppError } from './errors';
import { getLatestRelease } from './github';
import { getPort, visiblePortsOn } from '../registry';
import { SELF_REPO } from './selfUpdater';
import type { DatabaseBundle } from '../db';
import type { Platform, SelfUpdateInfo, UpdateCheckResult } from '../../shared/types';

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

interface LastCheckCache {
  tag: string;
  at: number;
}

export interface UpdateDeps {
  platform: Platform;
  db: DatabaseBundle;
  getGithubToken: () => string | null;
}

function normalizeVersion(version: string): string {
  return version.replace(/^v/i, '');
}

function compareVersions(a: string, b: string): number {
  const pa = normalizeVersion(a).split('.');
  const pb = normalizeVersion(b).split('.');
  const length = Math.max(pa.length, pb.length);
  for (let i = 0; i < length; i += 1) {
    const na = parseInt(pa[i] ?? '0', 10);
    const nb = parseInt(pb[i] ?? '0', 10);
    if (Number.isNaN(na) || Number.isNaN(nb)) {
      const sa = pa[i] ?? '0';
      const sb = pb[i] ?? '0';
      if (sa < sb) return -1;
      if (sa > sb) return 1;
      continue;
    }
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

function readCache(deps: UpdateDeps, repo: string): LastCheckCache | null {
  return deps.db.settings.getJson<LastCheckCache>(`lastCheck:${repo}`);
}

function writeCache(deps: UpdateDeps, repo: string, tag: string): void {
  deps.db.settings.setJson<LastCheckCache>(`lastCheck:${repo}`, { tag, at: Date.now() });
}

async function checkOne(
  deps: UpdateDeps,
  portId: string,
  force: boolean,
): Promise<UpdateCheckResult> {
  const port = getPort(portId);
  if (!port) {
    throw new AppError('UNKNOWN', `Unknown port: ${portId}`);
  }
  const installed = deps.db.ports.getInstalled(portId);
  const cache = force ? null : readCache(deps, port.repo);
  let latestTag: string;
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    latestTag = cache.tag;
  } else {
    const release = await getLatestRelease(port.repo, deps.getGithubToken() ?? undefined);
    latestTag = release.tag;
    writeCache(deps, port.repo, release.tag);
  }
  return {
    portId,
    installedVersion: installed?.version ?? null,
    latestVersion: latestTag,
    hasUpdate: installed ? compareVersions(latestTag, installed.version) > 0 : false,
    error: null,
  };
}

export async function checkForUpdates(deps: UpdateDeps, force = false): Promise<UpdateCheckResult[]> {
  const ports = visiblePortsOn(deps.platform);
  const results: UpdateCheckResult[] = [];
  for (const port of ports) {
    try {
      results.push(await checkOne(deps, port.id, force));
    } catch (err) {
      const appErr =
        err instanceof AppError ? err : new AppError('UNKNOWN', 'Update check failed', (err as Error).message);
      results.push({
        portId: port.id,
        installedVersion: null,
        latestVersion: '',
        hasUpdate: false,
        error: { code: appErr.code, message: appErr.message, detail: appErr.detail },
      });
    }
  }
  return results;
}

export async function checkForSelfUpdate(
  deps: UpdateDeps,
  currentVersion: string,
  force = false,
): Promise<SelfUpdateInfo> {
  const cache = force ? null : readCache(deps, SELF_REPO);
  try {
    let latestTag: string;
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      latestTag = cache.tag;
    } else {
      const release = await getLatestRelease(SELF_REPO, deps.getGithubToken() ?? undefined);
      latestTag = release.tag;
      writeCache(deps, SELF_REPO, release.tag);
    }
    return {
      currentVersion,
      latestVersion: latestTag,
      hasUpdate: compareVersions(latestTag, currentVersion) > 0,
      error: null,
    };
  } catch (err) {
    const appErr =
      err instanceof AppError ? err : new AppError('UNKNOWN', 'Update check failed', (err as Error).message);
    return {
      currentVersion,
      latestVersion: '',
      hasUpdate: false,
      error: { code: appErr.code, message: appErr.message, detail: appErr.detail },
    };
  }
}
