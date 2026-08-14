import fs from 'node:fs';
import path from 'node:path';
import { AppError } from './errors';
import { hashFile } from './hashes';
import type { AppPaths } from '../paths';
import type { DatabaseBundle } from '../db';
import type { PortConfig, RomStatus } from '../../shared/types';

export interface RomLibraryDeps {
  paths: AppPaths;
  db: DatabaseBundle;
}

function normalizeExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

export async function importRomForPort(
  deps: RomLibraryDeps,
  port: PortConfig,
  sourcePath: string,
): Promise<RomStatus> {
  const extension = normalizeExtension(sourcePath);
  const accepted = port.rom.acceptedExtensions.map((e) => e.toLowerCase());
  if (!accepted.includes(extension)) {
    throw new AppError(
      'ROM_EXTENSION_UNSUPPORTED',
      `"${path.basename(sourcePath)}" is not a supported ROM file for ${port.displayName}.`,
      `Accepted extensions: ${accepted.join(', ')}`,
    );
  }

  const hashes = await hashFile(sourcePath);
  const knownSha1 = port.rom.validHashes.sha1;
  const knownMd5 = port.rom.validHashes.md5 ?? [];
  const unverified = knownSha1.length === 0 && knownMd5.length === 0;
  if (!unverified) {
    const matches =
      (knownSha1.length > 0 && knownSha1.includes(hashes.sha1)) ||
      (knownMd5.length > 0 && knownMd5.includes(hashes.md5));
    if (!matches) {
      throw new AppError(
        'ROM_HASH_MISMATCH',
        `This ROM dump is not recognized as a supported copy for ${port.displayName}.`,
        `SHA-1: ${hashes.sha1}. Expected one of: ${knownSha1.slice(0, 8).join(', ')}${knownSha1.length > 8 ? ', …' : ''}`,
      );
    }
  }

  const existing = deps.db.roms.getBySha1(hashes.sha1);
  if (existing) {
    deps.db.roms.linkPortRom(port.id, existing.sha1);
    return { linked: true, unverified: false, rom: existing };
  }

  const cachedPath = path.join(deps.paths.romsDir, `${hashes.sha1}${extension}`);
  try {
    fs.mkdirSync(deps.paths.romsDir, { recursive: true });
    fs.copyFileSync(sourcePath, cachedPath);
  } catch (err) {
    throw new AppError('ROM_COPY_FAILED', 'Could not copy the ROM into the local ROM library', (err as Error).message);
  }

  const stat = fs.statSync(cachedPath);
  const rom = {
    sha1: hashes.sha1,
    md5: hashes.md5,
    sourcePath,
    cachedPath,
    extension,
    size: stat.size,
    validatedAt: Date.now(),
  };
  deps.db.roms.insert(rom);
  deps.db.roms.linkPortRom(port.id, rom.sha1);
  return { linked: true, unverified, rom };
}

export function getRomStatus(deps: RomLibraryDeps, port: PortConfig): RomStatus {
  const rom = deps.db.roms.getLinkedRom(port.id);
  if (!rom) {
    return { linked: false, unverified: false, rom: null };
  }
  const unverified =
    port.rom.validHashes.sha1.length === 0 && (port.rom.validHashes.md5 ?? []).length === 0;
  return { linked: true, unverified, rom };
}
