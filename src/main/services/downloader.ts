import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { AppError } from './errors';

export interface DownloadOptions {
  expectedSize?: number;
  digestSha256?: string;
  onProgress?: (downloadedBytes: number, totalBytes: number) => void;
  signal?: AbortSignal;
}

export async function downloadToFile(url: string, destPath: string, options: DownloadOptions = {}): Promise<void> {
  const { expectedSize, digestSha256, onProgress, signal } = options;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': 'portyoshka' },
      signal,
      redirect: 'follow',
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new AppError('CANCELLED', 'Download cancelled');
    }
    throw new AppError('NETWORK_OFFLINE', 'Download failed. Check your network connection.', (err as Error).message);
  }

  if (!response.ok) {
    throw new AppError('DOWNLOAD_FAILED', `Download failed (HTTP ${response.status})`);
  }

  const contentLengthHeader = Number(response.headers.get('content-length'));
  const totalBytes = expectedSize && expectedSize > 0 ? expectedSize : contentLengthHeader || 0;

  const tmpPath = `${destPath}.part`;
  fs.mkdirSync(path.dirname(tmpPath), { recursive: true });

  const sha256 = digestSha256 ? crypto.createHash('sha256') : null;
  let downloadedBytes = 0;

  try {
    const out = fs.createWriteStream(tmpPath);
    const body = response.body;
    if (!body) {
      throw new AppError('DOWNLOAD_FAILED', 'Download produced no data');
    }
    for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
      const buffer = Buffer.from(chunk);
      downloadedBytes += buffer.length;
      if (sha256) {
        sha256.update(buffer);
      }
      onProgress?.(downloadedBytes, totalBytes);
      if (!out.write(buffer)) {
        await new Promise<void>((resolve) => out.once('drain', resolve));
      }
    }
    await new Promise<void>((resolve, reject) => {
      out.end(() => resolve());
      out.on('error', reject);
    });
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOSPC') {
      throw new AppError('DISK_FULL', 'Not enough disk space to finish the download');
    }
    if ((err as Error).name === 'AbortError') {
      throw new AppError('CANCELLED', 'Download cancelled');
    }
    fs.rmSync(tmpPath, { force: true });
    throw new AppError('DOWNLOAD_FAILED', 'Download failed', (err as Error).message);
  }

  if (expectedSize && expectedSize > 0 && downloadedBytes !== expectedSize) {
    fs.rmSync(tmpPath, { force: true });
    throw new AppError(
      'DOWNLOAD_INCOMPLETE',
      `Downloaded ${downloadedBytes} of ${expectedSize} bytes. The download was cut short.`,
    );
  }

  if (sha256 && digestSha256) {
    const expectedHex = digestSha256.replace(/^sha256:/, '').toLowerCase();
    const actualHex = sha256.digest('hex');
    if (actualHex !== expectedHex) {
      fs.rmSync(tmpPath, { force: true });
      throw new AppError(
        'CHECKSUM_MISMATCH',
        'The downloaded file failed its checksum verification and was discarded.',
        `expected ${expectedHex}, got ${actualHex}`,
      );
    }
  }

  fs.renameSync(tmpPath, destPath);
}
