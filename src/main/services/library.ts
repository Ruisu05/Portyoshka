import { getPort, visiblePortsOn } from '../registry';
import { getRomStatus } from './romLibrary';
import { listSteamShortcutAppIds, steamShortcutAppId } from './steamShortcuts';
import type { DatabaseBundle } from '../db';
import type { AppPaths } from '../paths';
import type { InstalledPort, LibraryEntry, Platform, PortConfig, UpdateCheckResult } from '../../shared/types';
import type { LaunchManager } from './launcher';

export interface LibraryDeps {
  platform: Platform;
  db: DatabaseBundle;
  paths: AppPaths;
  launchManager: LaunchManager;
  updateResults: UpdateCheckResult[];
  getHomeDir: () => string;
}

function steamShortcutAppIds(deps: LibraryDeps): Set<number> {
  return listSteamShortcutAppIds(deps.platform, deps.getHomeDir());
}

function entrySteamAppId(installed: InstalledPort, port: PortConfig): number {
  return steamShortcutAppId(installed.executablePath, port.displayName);
}

export function buildLibrary(deps: LibraryDeps): LibraryEntry[] {
  const updateByPort = new Map(deps.updateResults.map((r) => [r.portId, r]));
  const steamIds = steamShortcutAppIds(deps);
  return visiblePortsOn(deps.platform).map((port) => {
    const installed = deps.db.ports.getInstalled(port.id);
    const update = updateByPort.get(port.id);
    const playtime = deps.db.playtime.get(port.id);
    return {
      port,
      installed,
      updateAvailable: update?.hasUpdate ?? false,
      latestVersion: update && !update.error ? update.latestVersion : null,
      romStatus: getRomStatus({ paths: deps.paths, db: deps.db }, port),
      running: deps.launchManager.isRunning(port.id),
      playtimeMs: playtime.totalMs,
      lastPlayedAt: playtime.lastPlayedAt,
      inSteam: installed ? steamIds.has(entrySteamAppId(installed, port)) : false,
    };
  });
}

export function buildCatalog(deps: LibraryDeps): PortConfig[] {
  const installedIds = new Set(deps.db.ports.listInstalled().map((p) => p.id));
  return visiblePortsOn(deps.platform).filter((port) => !installedIds.has(port.id));
}

export function getEntryPort(portId: string): PortConfig | undefined {
  return getPort(portId);
}
