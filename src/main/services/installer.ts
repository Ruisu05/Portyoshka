import fs from 'node:fs';
import path from 'node:path';
import { minimatch } from 'minimatch';
import { AppError } from './errors';
import { getLatestRelease } from './github';
import { downloadToFile } from './downloader';
import { extractArchive, detectArchiveKind } from './extractor';
import { collectUserFiles } from './userFiles';
import { getPort } from '../registry';
import type { AppPaths } from '../paths';
import type { DatabaseBundle } from '../db';
import type { InstalledPort, InstallProgress, Platform, ReleaseAsset } from '../../shared/types';

export interface InstallDeps {
  platform: Platform;
  paths: AppPaths;
  db: DatabaseBundle;
  getRootInstallDir: () => string;
  getPortDirOverride: (portId: string) => string | null;
  getGithubToken: () => string | null;
  emit: (progress: InstallProgress) => void;
}

function pickAsset(assets: ReleaseAsset[], pattern: string | undefined): ReleaseAsset {
  if (!pattern) {
    throw new AppError('NO_ASSET', 'This port has no configured release asset for your OS.');
  }
  const asset = assets.find((a) => minimatch(a.name, pattern, { nocase: true }));
  if (!asset) {
    throw new AppError(
      'NO_ASSET',
      `No release asset matched the pattern "${pattern}" for your OS. The release may not publish a build for it.`,
    );
  }
  return asset;
}

function resolveInstallDir(deps: InstallDeps, portId: string): string {
  const override = deps.getPortDirOverride(portId);
  if (override) {
    return path.resolve(override);
  }
  return path.join(path.resolve(deps.getRootInstallDir()), portId);
}

function hasGlobChars(value: string): boolean {
  return /[*?[\]{}()!]/.test(value);
}

function resolveExecutable(deps: InstallDeps, installDir: string, executableSpec: string): string {
  const platform = deps.platform;
  if (hasGlobChars(executableSpec)) {
    const matches: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile()) {
          const rel = path.relative(installDir, full);
          if (minimatch(rel, executableSpec, { nocase: platform === 'windows' })) {
            matches.push(full);
          }
        }
      }
    };
    walk(installDir);
    if (matches.length === 0) {
      throw new AppError(
        'EXECUTABLE_MISSING',
        `The install finished but no executable matching "${executableSpec}" was found.`,
      );
    }
    return matches[0];
  }
  const candidate = path.join(installDir, executableSpec);
  if (!fs.existsSync(candidate)) {
    throw new AppError(
      'EXECUTABLE_MISSING',
      `The install finished but the expected executable is missing: ${executableSpec}`,
    );
  }
  return candidate;
}

function preserveUserFiles(oldDir: string, stagingDir: string, patterns: string[]): void {
  if (!fs.existsSync(oldDir)) {
    return;
  }
  for (const rel of collectUserFiles(oldDir, patterns)) {
    const source = path.join(oldDir, rel);
    const target = path.join(stagingDir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

function latestBackupDir(dataDir: string, portId: string): string | null {
  const root = path.join(dataDir, 'backups', portId);
  if (!fs.existsSync(root)) {
    return null;
  }
  const entries = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, mtime: fs.statSync(path.join(root, e.name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return entries.length > 0 ? path.join(root, entries[0].name) : null;
}

function restoreBackup(backupDir: string, stagingDir: string): void {
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) {
        continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const rel = path.relative(backupDir, full);
        const target = path.join(stagingDir, rel);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(full, target);
      }
    }
  };
  walk(backupDir);
}

async function installPortInternal(deps: InstallDeps, portId: string, signal?: AbortSignal): Promise<InstalledPort> {
  const port = getPort(portId);
  if (!port) {
    throw new AppError('UNKNOWN', `Unknown port: ${portId}`);
  }
  const platform = deps.platform;

  deps.emit({ portId, stage: 'checking-release', percent: 0, downloadedBytes: 0, totalBytes: 0 });
  const release = await getLatestRelease(port.repo, deps.getGithubToken() ?? undefined);
  const asset = pickAsset(release.assets, port.assetPattern[platform]);
  const kind = detectArchiveKind(asset.name);
  const isArchive = kind !== 'unsupported';

  const installDir = resolveInstallDir(deps, portId);
  const archivePath = path.join(deps.paths.tmpDir, `${portId}-${release.tag}-${asset.name}`);
  const stagingDir = `${installDir}.staging-${Date.now()}`;
  const backupDir = `${installDir}.old-${Date.now()}`;

  try {
    deps.emit({
      portId,
      stage: 'downloading',
      percent: 0,
      downloadedBytes: 0,
      totalBytes: asset.size,
      message: asset.name,
    });
    await downloadToFile(asset.browserDownloadUrl, archivePath, {
      expectedSize: asset.size,
      digestSha256: asset.digest,
      signal,
      onProgress: (downloadedBytes, totalBytes) => {
        deps.emit({
          portId,
          stage: 'downloading',
          percent: totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 90) : 0,
          downloadedBytes,
          totalBytes,
          message: asset.name,
        });
      },
    });

    fs.rmSync(stagingDir, { recursive: true, force: true });
    fs.mkdirSync(stagingDir, { recursive: true });

    if (isArchive) {
      deps.emit({
        portId,
        stage: 'extracting',
        percent: 90,
        downloadedBytes: asset.size,
        totalBytes: asset.size,
      });
      await extractArchive(archivePath, stagingDir, (processed, total) => {
        deps.emit({
          portId,
          stage: 'extracting',
          percent: total > 0 ? 90 + Math.round((processed / total) * 8) : 90,
          downloadedBytes: processed,
          totalBytes: total,
        });
      });
    } else {
      fs.copyFileSync(archivePath, path.join(stagingDir, asset.name));
    }

    deps.emit({ portId, stage: 'finalizing', percent: 99, downloadedBytes: 0, totalBytes: 0 });
    preserveUserFiles(installDir, stagingDir, port.preserveOnUpdate);
    const restoreFrom = fs.existsSync(installDir) ? null : latestBackupDir(deps.paths.dataDir, port.id);
    if (restoreFrom) {
      restoreBackup(restoreFrom, stagingDir);
    }

    if (fs.existsSync(installDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
      fs.renameSync(installDir, backupDir);
    }
    try {
      fs.renameSync(stagingDir, installDir);
    } catch (err) {
      if (fs.existsSync(backupDir) && !fs.existsSync(installDir)) {
        fs.renameSync(backupDir, installDir);
      }
      throw err;
    }
    fs.rmSync(backupDir, { recursive: true, force: true });

    const executableSpec = port.executable[platform];
    if (!executableSpec) {
      throw new AppError('NO_ASSET', 'This port has no configured executable for your OS.');
    }
    const executablePath = resolveExecutable(deps, installDir, executableSpec);
    if (platform !== 'windows') {
      fs.chmodSync(executablePath, 0o755);
    }

    const installed: InstalledPort = {
      id: port.id,
      version: release.tag,
      installPath: installDir,
      executablePath,
      updatedAt: Date.now(),
    };
    deps.db.ports.upsertInstalled(installed);

    deps.emit({ portId, stage: 'done', percent: 100, downloadedBytes: 0, totalBytes: 0 });
    return installed;
  } catch (err) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
    fs.rmSync(archivePath, { force: true });
    if (err instanceof AppError) {
      throw err;
    }
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOSPC') {
      throw new AppError('DISK_FULL', 'Not enough disk space to finish the install.');
    }
    if ((err as Error).name === 'AbortError') {
      throw new AppError('CANCELLED', 'Install cancelled');
    }
    throw new AppError('UNKNOWN', 'Install failed unexpectedly', (err as Error).message);
  } finally {
    fs.rmSync(archivePath, { force: true });
  }
}

export async function installPort(deps: InstallDeps, portId: string, signal?: AbortSignal): Promise<InstalledPort> {
  return installPortInternal(deps, portId, signal);
}
