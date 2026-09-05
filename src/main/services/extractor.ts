import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import yauzl from 'yauzl';
import * as tar from 'tar';
import { AppError } from './errors';

export type ArchiveKind = 'zip' | 'tar.gz' | 'unsupported';

export function detectArchiveKind(fileName: string): ArchiveKind {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.zip')) {
    return 'zip';
  }
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
    return 'tar.gz';
  }
  return 'unsupported';
}

export function detectArchiveKindByContent(filePath: string): ArchiveKind {
  let fd: number;
  try {
    fd = fs.openSync(filePath, 'r');
  } catch {
    return 'unsupported';
  }
  try {
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    if (buf[0] === 0x50 && buf[1] === 0x4b) {
      return 'zip';
    }
    if (buf[0] === 0x1f && buf[1] === 0x8b) {
      return 'tar.gz';
    }
    return 'unsupported';
  } catch {
    return 'unsupported';
  } finally {
    fs.closeSync(fd);
  }
}

function assertInside(destDir: string, entryPath: string): string {
  const resolved = path.resolve(destDir, entryPath);
  const root = path.resolve(destDir) + path.sep;
  if (resolved !== path.resolve(destDir) && !resolved.startsWith(root)) {
    throw new AppError('EXTRACT_FAILED', 'Archive contains a path outside its destination and was rejected', entryPath);
  }
  return resolved;
}

export async function extractZip(
  archivePath: string,
  destDir: string,
  onProgress?: (processed: number, total: number) => void,
): Promise<void> {
  const zipfile = await new Promise<yauzl.ZipFile>((resolve, reject) => {
    yauzl.open(archivePath, { lazyEntries: true }, (err, zf) => {
      if (err || !zf) {
        reject(
          new AppError(
            'EXTRACT_FAILED',
            'Could not open the downloaded zip. It may be corrupt.',
            err ? err.message : undefined,
          ),
        );
        return;
      }
      resolve(zf);
    });
  });

  const total = zipfile.entryCount;
  let processed = 0;
  const pendingSymlinks: Array<{ destPath: string; target: string }> = [];
  fs.mkdirSync(destDir, { recursive: true });

  await new Promise<void>((resolve, reject) => {
    zipfile.on('entry', (entry: yauzl.Entry) => {
      const entryPath = entry.fileName.replace(/\\/g, '/');
      if (entryPath.endsWith('/')) {
        processed += 1;
        onProgress?.(processed, total);
        zipfile.readEntry();
        return;
      }

      let destPath: string;
      try {
        destPath = assertInside(destDir, entryPath);
      } catch (err) {
        zipfile.close();
        reject(err);
        return;
      }

      const unixMode = entry.externalFileAttributes >>> 16;
      if (unixMode && (unixMode & 0o170000) === 0o120000) {
        zipfile.openReadStream(entry, (streamErr, readStream) => {
          if (streamErr || !readStream) {
            zipfile.close();
            reject(
              new AppError(
                'EXTRACT_FAILED',
                'Could not read a symlink entry from the downloaded zip.',
                streamErr ? streamErr.message : undefined,
              ),
            );
            return;
          }
          const chunks: Buffer[] = [];
          readStream.on('data', (chunk: Buffer) => chunks.push(chunk));
          readStream.on('error', (err: Error) => {
            zipfile.close();
            reject(new AppError('EXTRACT_FAILED', 'Extraction failed', err.message));
          });
          readStream.on('end', () => {
            const target = path.resolve(path.dirname(destPath), Buffer.concat(chunks).toString('utf8').trim());
            const root = path.resolve(destDir) + path.sep;
            if (target !== path.resolve(destDir) && !target.startsWith(root)) {
              zipfile.close();
              reject(new AppError('EXTRACT_FAILED', 'Archive contains a symbolic link escaping its destination and was rejected', entryPath));
              return;
            }
            pendingSymlinks.push({ destPath, target });
            processed += 1;
            onProgress?.(processed, total);
            zipfile.readEntry();
          });
        });
        return;
      }

      zipfile.openReadStream(entry, (streamErr, readStream) => {
        if (streamErr || !readStream) {
          zipfile.close();
          reject(
            new AppError(
              'EXTRACT_FAILED',
              'Could not read an entry from the downloaded zip. It may be corrupt.',
              streamErr ? streamErr.message : undefined,
            ),
          );
          return;
        }
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        const out = fs.createWriteStream(destPath);
        if (unixMode) {
          out.once('close', () => {
            fs.chmod(destPath, unixMode & 0o777, () => {});
          });
        }
        pipeline(readStream, out)
          .then(() => {
            processed += 1;
            onProgress?.(processed, total);
            zipfile.readEntry();
          })
          .catch((err: Error) => {
            zipfile.close();
            reject(new AppError('EXTRACT_FAILED', 'Extraction failed', err.message));
          });
      });
    });
    zipfile.on('end', () => {
      try {
        for (const { destPath, target } of pendingSymlinks) {
          try {
            fs.symlinkSync(target, destPath, 'file');
          } catch (symErr) {
            if ((symErr as NodeJS.ErrnoException).code === 'EEXIST') {
              continue;
            }
            // Creating symlinks can be restricted (e.g. Windows without
            // developer mode); duplicate the target file instead.
            fs.copyFileSync(target, destPath);
          }
        }
        resolve();
      } catch (err) {
        reject(new AppError('EXTRACT_FAILED', 'Could not create symlinks', (err as Error).message));
      }
    });
    zipfile.on('error', (err: Error) => reject(new AppError('EXTRACT_FAILED', 'Extraction failed', err.message)));
    zipfile.readEntry();
  });
}

export async function extractTarGz(
  archivePath: string,
  destDir: string,
  onProgress?: (processed: number) => void,
): Promise<void> {
  fs.mkdirSync(destDir, { recursive: true });
  let processed = 0;
  try {
    await tar.x({
      file: archivePath,
      cwd: destDir,
      filter: (entryPath: string, entry: tar.ReadEntry | fs.Stats) => {
        const entryType = 'type' in entry ? (entry.type as string) : null;
        if (entryType === 'SymbolicLink' || entryType === 'Link') {
          throw new AppError('EXTRACT_FAILED', 'Archive contains a link and was rejected', entryPath);
        }
        assertInside(destDir, entryPath);
        processed += 1;
        onProgress?.(processed);
        return true;
      },
      strict: true,
    });
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError('EXTRACT_FAILED', 'Extraction failed', (err as Error).message);
  }
}

export async function extractArchive(
  archivePath: string,
  destDir: string,
  onProgress?: (processed: number, total: number) => void,
): Promise<void> {
  const kind = detectArchiveKind(path.basename(archivePath));
  if (kind === 'zip') {
    return extractZip(archivePath, destDir, onProgress);
  }
  if (kind === 'tar.gz') {
    return extractTarGz(archivePath, destDir, (processed) => onProgress?.(processed, 0));
  }
  throw new AppError(
    'EXTRACT_UNSUPPORTED',
    `This archive format is not supported yet: ${path.basename(archivePath)}`,
  );
}
