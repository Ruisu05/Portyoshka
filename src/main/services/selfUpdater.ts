import { app, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { AppError } from './errors';
import { getLatestRelease } from './github';
import { downloadToFile } from './downloader';
import type { AppPaths } from '../paths';
import type { Platform, ReleaseAsset, SelfUpdateProgress } from '../../shared/types';

export const SELF_REPO = 'Ruisu05/Portyoshka';
export const SELF_RELEASES_URL = `https://github.com/${SELF_REPO}/releases`;

export interface SelfUpdateDeps {
  platform: Platform;
  paths: AppPaths;
  getGithubToken: () => string | null;
  emit: (progress: SelfUpdateProgress) => void;
}

function isAppImage(): boolean {
  return Boolean(process.env.APPIMAGE);
}

function pickAsset(platform: Platform, assets: ReleaseAsset[]): ReleaseAsset | null {
  const match = (pattern: RegExp) => assets.find((a) => pattern.test(a.name)) ?? null;
  if (platform === 'windows') {
    return match(/-Windows-Setup\.exe$/i);
  }
  if (platform === 'linux') {
    if (isAppImage()) {
      return match(/-Linux\.AppImage$/i);
    }
    return match(/-Linux\.deb$/i);
  }
  return match(/darwin.*\.zip$/i);
}

async function downloadAsset(
  deps: SelfUpdateDeps,
  asset: ReleaseAsset,
  destDir: string,
): Promise<string> {
  const dest = path.join(destDir, asset.name);
  deps.emit({
    stage: 'downloading',
    percent: 0,
    downloadedBytes: 0,
    totalBytes: asset.size,
    message: asset.name,
  });
  await downloadToFile(asset.browserDownloadUrl, dest, {
    expectedSize: asset.size,
    digestSha256: asset.digest,
    onProgress: (downloadedBytes, totalBytes) => {
      deps.emit({
        stage: 'downloading',
        percent: totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0,
        downloadedBytes,
        totalBytes,
        message: asset.name,
      });
    },
  });
  return dest;
}

function replaceRunningAppImage(newFile: string): void {
  const appImagePath = process.env.APPIMAGE;
  if (!appImagePath) {
    throw new AppError('UNKNOWN', 'APPIMAGE environment variable is missing');
  }
  fs.chmodSync(newFile, 0o755);
  const staged = `${appImagePath}.new`;
  fs.copyFileSync(newFile, staged);
  fs.renameSync(staged, appImagePath);
}

export async function performSelfUpdate(deps: SelfUpdateDeps): Promise<void> {
  const release = await getLatestRelease(SELF_REPO, deps.getGithubToken() ?? undefined);
  const asset = pickAsset(deps.platform, release.assets);
  if (!asset) {
    throw new AppError(
      'NO_ASSET',
      `No installer for your OS in release ${release.tag}. Check the releases page.`,
    );
  }

  const appImagePath = process.env.APPIMAGE;

  if (deps.platform === 'linux' && appImagePath) {
    const downloaded = await downloadAsset(deps, asset, deps.paths.tmpDir);
    deps.emit({ stage: 'preparing', percent: 100, downloadedBytes: 0, totalBytes: 0 });
    replaceRunningAppImage(downloaded);
    const child = spawn(appImagePath, [], { detached: true, stdio: 'ignore' });
    child.unref();
    app.exit(0);
    return;
  }

  if (deps.platform === 'windows') {
    const downloaded = await downloadAsset(deps, asset, deps.paths.tmpDir);
    deps.emit({ stage: 'opening', percent: 100, downloadedBytes: 0, totalBytes: 0 });
    const child = spawn(downloaded, [], { detached: true, stdio: 'ignore' });
    child.unref();
    app.exit(0);
    return;
  }

  if (deps.platform === 'linux') {
    const downloaded = await downloadAsset(deps, asset, deps.paths.tmpDir);
    deps.emit({ stage: 'opening', percent: 100, downloadedBytes: 0, totalBytes: 0 });
    await shell.openPath(downloaded);
    return;
  }

  await shell.openExternal(SELF_RELEASES_URL);
}