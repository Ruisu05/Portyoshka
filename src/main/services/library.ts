import { getPort, visiblePortsOn } from '../registry';
import { getRomStatus } from './romLibrary';
import type { DatabaseBundle } from '../db';
import type { AppPaths } from '../paths';
import type { LibraryEntry, Platform, PortConfig, UpdateCheckResult } from '../../shared/types';
import type { LaunchManager } from './launcher';

export interface LibraryDeps {
  platform: Platform;
  db: DatabaseBundle;
  paths: AppPaths;
  launchManager: LaunchManager;
  updateResults: UpdateCheckResult[];
}

export function buildLibrary(deps: LibraryDeps): LibraryEntry[] {
  const updateByPort = new Map(deps.updateResults.map((r) => [r.portId, r]));
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
