import fs from 'node:fs';
import crypto from 'node:crypto';
import { AppError } from './errors';

export interface FileHashes {
  md5: string;
  sha1: string;
}

export function hashFile(filePath: string): Promise<FileHashes> {
  return new Promise((resolve, reject) => {
    const md5 = crypto.createHash('md5');
    const sha1 = crypto.createHash('sha1');
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => reject(new AppError('ROM_READ_FAILED', 'Could not read the selected file', (err as Error).message)));
    stream.on('data', (chunk: Buffer) => {
      md5.update(chunk);
      sha1.update(chunk);
    });
    stream.on('end', () => {
      resolve({ md5: md5.digest('hex'), sha1: sha1.digest('hex') });
    });
  });
}
