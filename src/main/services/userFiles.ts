import fs from 'node:fs';
import path from 'node:path';
import { minimatch } from 'minimatch';

export function matchesUserPattern(relPath: string, patterns: string[]): boolean {
  const basename = path.basename(relPath);
  return patterns.some((p) => minimatch(relPath, p) || minimatch(basename, p));
}

export function collectUserFiles(rootDir: string, patterns: string[]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(rootDir)) {
    return results;
  }
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) {
        continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const rel = path.relative(rootDir, full).split(path.sep).join('/');
        if (matchesUserPattern(rel, patterns)) {
          results.push(rel);
        }
      }
    }
  };
  walk(rootDir);
  return results;
}
