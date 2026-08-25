import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import yauzl from 'yauzl';
import { AppError } from './errors';
import type { AppPaths } from '../paths';
import type {
  InstalledPort,
  ModCatalog,
  ModIndexEntry,
  Platform,
  PortConfig,
} from '../../shared/types';

export interface ModsDeps {
  platform: Platform;
  paths: AppPaths;
}

const FETCH_TIMEOUT_MS = 30000;
const CATALOG_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_GAMEBANANA_PAGES = 60;

interface CatalogCacheEntry {
  fetchedAt: number;
  categories: string[];
  entries: ModIndexEntry[];
}

interface InstalledModRecord {
  version: string | null;
  updatedAt: number | null;
  files: string[];
}

type ModRegistry = Record<string, InstalledModRecord>;

const catalogCache = new Map<string, CatalogCacheEntry>();

export function resolveModsDir(
  platform: Platform,
  installed: InstalledPort,
  config: NonNullable<PortConfig['mods']>,
): string {
  const exeDir = path.dirname(installed.executablePath);
  if (config.layout === 'flat-files') {
    return path.join(exeDir, 'mods');
  }
  if (config.portableMarker && fs.existsSync(path.join(exeDir, config.portableMarker))) {
    return path.join(exeDir, 'mods');
  }
  if (platform === 'windows') {
    const appData = process.env.APPDATA;
    if (appData && config.appDataFolder) {
      return path.join(appData, config.appDataFolder, 'mods');
    }
  }
  if (platform === 'macos') {
    return path.join(os.homedir(), 'Library', 'Application Support', config.appDataFolder ?? '', 'mods');
  }
  const dataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(dataHome, config.appDataFolder ?? '', 'mods');
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': 'portyoshka', Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    throw new AppError('NETWORK_OFFLINE', 'Cannot reach the mod source. Check your network connection.');
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new AppError('API_ERROR', `The mod source returned HTTP ${response.status}`);
  }
  return response.text();
}

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const text = await fetchText(url);
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new AppError('API_ERROR', 'The mod source returned invalid JSON');
  }
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v ? v : undefined;
}

function parseIndexEntries(doc: Record<string, unknown>): { categories: string[]; entries: ModIndexEntry[] } {
  const categories = Array.isArray(doc.categories)
    ? doc.categories.filter((c): c is string => typeof c === 'string')
    : [];
  const entries: ModIndexEntry[] = [];
  if (Array.isArray(doc.mods)) {
    for (const raw of doc.mods as Record<string, unknown>[]) {
      if (!raw || typeof raw.id !== 'string' || !raw.id) {
        continue;
      }
      const latest = raw.latest as
        | { version?: unknown; tag?: unknown; zip?: { name?: unknown; url?: unknown; size?: unknown } | null }
        | undefined;
      const github = str(raw.github);
      const repoUrl = str(raw.repo);
      entries.push({
        id: raw.id,
        title: str(raw.title) ?? raw.id,
        author: str(raw.author),
        version: str(raw.version),
        summary: str(raw.summary),
        categories: Array.isArray(raw.categories)
          ? raw.categories.filter((c): c is string => typeof c === 'string')
          : undefined,
        downloadURL: str(raw.downloadURL),
        thumbnail: str(raw.thumbnail),
        pageUrl: github
          ? `https://github.com/${github.replace(/^https?:\/\/github\.com\//, '')}`
          : repoUrl,
        latest: latest
          ? {
              version: str(latest.version),
              tag: str(latest.tag),
              zip: latest.zip
                ? {
                    name: str(latest.zip.name),
                    url: str(latest.zip.url),
                    size: typeof latest.zip.size === 'number' ? latest.zip.size : undefined,
                  }
                : null,
            }
          : null,
      });
    }
  }
  entries.sort((a, b) => a.title.localeCompare(b.title));
  return { categories, entries };
}

function gamebananaThumbnail(raw: Record<string, unknown>): string | undefined {
  const preview = raw._aPreviewMedia as { _aImages?: Array<Record<string, unknown>> } | undefined;
  const first = preview?._aImages?.[0];
  if (!first) {
    return undefined;
  }
  const base = str(first._sBaseUrl);
  const file = str(first._sFile220) ?? str(first._sFile100) ?? str(first._sFile);
  return base && file ? `${base}/${file}` : undefined;
}

function parseGamebananaRecord(raw: Record<string, unknown>): ModIndexEntry | null {
  if (raw._sModelName !== 'Mod' || raw._bHasFiles !== true || raw._bIsObsolete === true) {
    return null;
  }
  const id = typeof raw._idRow === 'number' ? String(raw._idRow) : undefined;
  if (!id) {
    return null;
  }
  const submitter = raw._aSubmitter as { _sName?: unknown } | undefined;
  const rootCategory = raw._aRootCategory as { _sName?: unknown } | undefined;
  const categoryName = str(rootCategory?._sName);
  const updatedAt =
    (typeof raw._tsDateUpdated === 'number' ? raw._tsDateUpdated : undefined) ??
    (typeof raw._tsDateModified === 'number' ? raw._tsDateModified : undefined);
  return {
    id,
    title: str(raw._sName) ?? id,
    author: str(submitter?._sName),
    version: str(raw._sVersion),
    categories: categoryName ? [categoryName] : undefined,
    thumbnail: gamebananaThumbnail(raw),
    updatedAt,
    pageUrl: `https://gamebanana.com/mods/${id}`,
  };
}

async function fetchGamebananaCatalog(gameId: number): Promise<{ categories: string[]; entries: ModIndexEntry[] }> {
  const entries: ModIndexEntry[] = [];
  for (let page = 1; page <= MAX_GAMEBANANA_PAGES; page += 1) {
    const doc = await fetchJson(
      `https://gamebanana.com/apiv11/Game/${gameId}/Subfeed?_nPage=${page}` +
        '&_csvProperties=_idRow,_sName,_sModelName,_sVersion,_tsDateUpdated,_tsDateModified,_bHasFiles,_bIsObsolete,_aSubmitter,_aPreviewMedia,_aRootCategory',
    );
    const records = Array.isArray(doc._aRecords) ? (doc._aRecords as Record<string, unknown>[]) : [];
    for (const raw of records) {
      const entry = parseGamebananaRecord(raw);
      if (entry) {
        entries.push(entry);
      }
    }
    const meta = doc._aMetadata as { _bIsComplete?: unknown } | undefined;
    if (records.length === 0 || meta?._bIsComplete === true) {
      break;
    }
  }
  entries.sort((a, b) => a.title.localeCompare(b.title));
  return { categories: [], entries };
}

async function fetchCatalog(config: NonNullable<PortConfig['mods']>): Promise<{ categories: string[]; entries: ModIndexEntry[] }> {
  const source = config.source;
  const cacheKey =
    source.kind === 'index' ? source.indexUrl : `gamebanana:${source.gameId}`;
  const cached = catalogCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CATALOG_CACHE_TTL_MS) {
    return { categories: cached.categories, entries: cached.entries };
  }
  let result: { categories: string[]; entries: ModIndexEntry[] };
  if (source.kind === 'gamebanana') {
    result = await fetchGamebananaCatalog(source.gameId);
  } else {
    let text: string;
    try {
      text = await fetchText(source.indexUrl);
    } catch (err) {
      if (!source.fallbackIndexUrl) {
        throw err;
      }
      text = await fetchText(source.fallbackIndexUrl);
    }
    let doc: Record<string, unknown>;
    try {
      doc = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new AppError('API_ERROR', 'The mod index is not valid JSON');
    }
    if (doc.schema_version !== 1) {
      throw new AppError('API_ERROR', `Unsupported mod index schema: ${doc.schema_version}`);
    }
    result = parseIndexEntries(doc);
  }
  catalogCache.set(cacheKey, { fetchedAt: Date.now(), ...result });
  return result;
}

function registryPath(deps: ModsDeps, portId: string): string {
  return path.join(deps.paths.dataDir, 'mods-registry', `${portId}.json`);
}

function readRegistry(deps: ModsDeps, portId: string): ModRegistry {
  try {
    if (!fs.existsSync(registryPath(deps, portId))) {
      return {};
    }
    return JSON.parse(fs.readFileSync(registryPath(deps, portId), 'utf8')) as ModRegistry;
  } catch {
    return {};
  }
}

function writeRegistry(deps: ModsDeps, portId: string, registry: ModRegistry): void {
  fs.mkdirSync(path.dirname(registryPath(deps, portId)), { recursive: true });
  fs.writeFileSync(registryPath(deps, portId), JSON.stringify(registry, null, 2), 'utf8');
}

function readManifestVersion(modsDir: string, modId: string): string | null {
  try {
    const manifestPath = path.join(modsDir, modId, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      return null;
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { version?: unknown };
    return typeof manifest.version === 'string' ? manifest.version : null;
  } catch {
    return null;
  }
}

export async function getMods(
  deps: ModsDeps,
  port: PortConfig,
  installed: InstalledPort,
): Promise<ModCatalog> {
  const config = port.mods;
  if (!config) {
    throw new AppError('UNKNOWN', 'This port has no mod support');
  }
  const { categories, entries } = await fetchCatalog(config);
  const modsDir = resolveModsDir(deps.platform, installed, config);
  const registry = config.layout === 'flat-files' ? readRegistry(deps, port.id) : null;
  return {
    categories,
    mods: entries.map((entry) => {
      if (config.layout === 'flat-files') {
        const record = registry?.[entry.id] ?? null;
        return {
          ...entry,
          installedVersion: record?.version ?? null,
          installedUpdatedAt: record?.updatedAt ?? null,
        };
      }
      return {
        ...entry,
        installedVersion: readManifestVersion(modsDir, entry.id),
        installedUpdatedAt: null,
      };
    }),
  };
}

function indexZipUrl(entry: ModIndexEntry): string | null {
  return entry.latest?.zip?.url ?? entry.downloadURL ?? null;
}

interface GamebananaFile {
  id: string;
  name: string;
  size: number;
  url: string;
  version?: string;
  addedAt: number;
}

async function fetchGamebananaFiles(modId: string): Promise<GamebananaFile[]> {
  const doc = await fetchJson(
    `https://gamebanana.com/apiv11/Mod/${modId}?_csvProperties=_aFiles`,
  );
  const files: GamebananaFile[] = [];
  if (Array.isArray(doc._aFiles)) {
    for (const raw of doc._aFiles as Record<string, unknown>[]) {
      const url = str(raw._sDownloadUrl);
      const name = str(raw._sFile);
      if (!url || !name) {
        continue;
      }
      files.push({
        id: typeof raw._idRow === 'number' ? String(raw._idRow) : '',
        name,
        size: typeof raw._nFilesize === 'number' ? raw._nFilesize : 0,
        url,
        version: str(raw._sVersion),
        addedAt: typeof raw._tsDateAdded === 'number' ? raw._tsDateAdded : 0,
      });
    }
  }
  return files;
}

function pickGamebananaFile(files: GamebananaFile[]): GamebananaFile | null {
  const lower = (n: string) => n.toLowerCase();
  return (
    files.find((f) => lower(f.name).endsWith('.zip')) ??
    files.find((f) => lower(f.name).endsWith('.tar.gz') || lower(f.name).endsWith('.tgz')) ??
    null
  );
}

async function downloadZip(url: string, destPath: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, { headers: { 'User-Agent': 'portyoshka' }, signal: controller.signal });
  } catch {
    clearTimeout(timeout);
    throw new AppError('NETWORK_OFFLINE', 'Cannot download the mod. Check your network connection.');
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new AppError('DOWNLOAD_FAILED', `The mod download returned HTTP ${response.status}`);
  }
  const body = await response.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(body));
}

interface ZipEntryInfo {
  name: string;
  directory: boolean;
  mode: number;
}

function readZipEntries(archivePath: string): Promise<ZipEntryInfo[]> {
  return new Promise((resolve, reject) => {
    yauzl.open(archivePath, { lazyEntries: false }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(new AppError('EXTRACT_FAILED', 'Could not open the mod zip. It may be corrupt.', err?.message));
        return;
      }
      const entries: ZipEntryInfo[] = [];
      zipfile.on('entry', (entry: yauzl.Entry) => {
        entries.push({
          name: entry.fileName.replace(/\\/g, '/'),
          directory: entry.fileName.endsWith('/'),
          mode: entry.externalFileAttributes >>> 16,
        });
      });
      zipfile.on('end', () => resolve(entries));
      zipfile.on('error', (zipErr: Error) => reject(new AppError('EXTRACT_FAILED', 'Could not read the mod zip', zipErr.message)));
    });
  });
}

function commonPrefix(entries: ZipEntryInfo[]): string {
  const files = entries.filter((e) => !e.directory);
  if (files.some((e) => e.name === 'manifest.json')) {
    return '';
  }
  const topFolders = new Set(files.map((e) => e.name.split('/')[0]));
  if (topFolders.size === 1) {
    const folder = [...topFolders][0];
    if (files.every((e) => e.name.startsWith(`${folder}/`))) {
      return `${folder}/`;
    }
  }
  return '';
}

interface ExtractSelection {
  prefix: string;
  names: string[];
}

async function extractSelected(
  archivePath: string,
  destDir: string,
  selection: ExtractSelection,
): Promise<void> {
  const wanted = new Set(selection.names);
  const zipfile = await new Promise<yauzl.ZipFile>((resolve, reject) => {
    yauzl.open(archivePath, { lazyEntries: true }, (err, zf) => {
      if (err || !zf) {
        reject(new AppError('EXTRACT_FAILED', 'Could not open the mod zip. It may be corrupt.', err?.message));
        return;
      }
      resolve(zf);
    });
  });

  await new Promise<void>((resolve, reject) => {
    zipfile.on('entry', (entry: yauzl.Entry) => {
      const entryPath = entry.fileName.replace(/\\/g, '/');
      if (!wanted.has(entryPath)) {
        zipfile.readEntry();
        return;
      }
      const rel = entryPath.slice(selection.prefix.length);
      const destPath = path.resolve(destDir, rel);
      const root = path.resolve(destDir) + path.sep;
      if (destPath !== path.resolve(destDir) && !destPath.startsWith(root)) {
        zipfile.close();
        reject(new AppError('EXTRACT_FAILED', 'The mod zip contains a path outside its destination and was rejected', entryPath));
        return;
      }
      const unixMode = entry.externalFileAttributes >>> 16;
      if (unixMode && (unixMode & 0o170000) === 0o120000) {
        zipfile.close();
        reject(new AppError('EXTRACT_FAILED', 'The mod zip contains a symbolic link and was rejected', entryPath));
        return;
      }
      zipfile.openReadStream(entry, (streamErr, readStream) => {
        if (streamErr || !readStream) {
          zipfile.close();
          reject(new AppError('EXTRACT_FAILED', 'Could not read an entry from the mod zip', streamErr?.message));
          return;
        }
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        const out = fs.createWriteStream(destPath);
        pipeline(readStream, out)
          .then(() => {
            if (unixMode) {
              fs.chmod(destPath, unixMode & 0o777, () => {});
            }
            zipfile.readEntry();
          })
          .catch((err: Error) => {
            zipfile.close();
            reject(new AppError('EXTRACT_FAILED', 'Extraction failed', err.message));
          });
      });
    });
    zipfile.on('end', () => resolve());
    zipfile.on('error', (err: Error) => reject(new AppError('EXTRACT_FAILED', 'Extraction failed', err.message)));
    zipfile.readEntry();
  });
}

function matchesModFile(name: string, extensions: string[]): boolean {
  const lower = name.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext.toLowerCase()));
}

async function installFromIndex(
  deps: ModsDeps,
  port: PortConfig,
  installed: InstalledPort,
  config: NonNullable<PortConfig['mods']>,
  entry: ModIndexEntry,
): Promise<void> {
  const url = indexZipUrl(entry);
  if (!url) {
    throw new AppError('NO_ASSET', 'This mod has no installable release or download');
  }
  const archivePath = path.join(deps.paths.tmpDir, `${port.id}-mod-${entry.id}-${Date.now()}.zip`);
  try {
    await downloadZip(url, archivePath);
    const zipEntries = await readZipEntries(archivePath);
    if (zipEntries.some((e) => !e.directory && e.name.includes('baseroms/'))) {
      throw new AppError('EXTRACT_FAILED', 'Mod archives must not include user-supplied baseroms files');
    }
    const prefix = commonPrefix(zipEntries);
    if (!zipEntries.some((e) => !e.directory && e.name === `${prefix}manifest.json`)) {
      throw new AppError('EXTRACT_FAILED', 'The mod zip has no readable manifest.json');
    }
    const modsDir = resolveModsDir(deps.platform, installed, config);
    const destDir = path.join(modsDir, entry.id);
    fs.rmSync(destDir, { recursive: true, force: true });
    fs.mkdirSync(destDir, { recursive: true });
    await extractSelected(
      archivePath,
      destDir,
      { prefix, names: zipEntries.filter((e) => !e.directory).map((e) => e.name) },
    );
  } finally {
    fs.rmSync(archivePath, { force: true });
  }
}

async function installFromGamebanana(
  deps: ModsDeps,
  port: PortConfig,
  installed: InstalledPort,
  config: NonNullable<PortConfig['mods']>,
  entry: ModIndexEntry,
): Promise<void> {
  const files = await fetchGamebananaFiles(entry.id);
  const file = pickGamebananaFile(files);
  if (!file) {
    throw new AppError('NO_ASSET', 'This mod has no installable zip archive');
  }
  const extensions = config.modFileExtensions ?? [];
  const archivePath = path.join(deps.paths.tmpDir, `${port.id}-mod-${entry.id}-${Date.now()}.zip`);
  try {
    await downloadZip(file.url, archivePath);
    const zipEntries = await readZipEntries(archivePath);
    const prefix = commonPrefix(zipEntries);
    const candidates = zipEntries.filter(
      (e) => !e.directory && e.name.startsWith(prefix) && matchesModFile(e.name, extensions),
    );
    if (candidates.length === 0) {
      throw new AppError(
        'EXTRACT_FAILED',
        `The archive has no mod files (${extensions.join(', ') || 'none configured'})`,
      );
    }
    const modsDir = resolveModsDir(deps.platform, installed, config);
    fs.mkdirSync(modsDir, { recursive: true });
    const relFiles = candidates.map((e) => e.name.slice(prefix.length));
    for (const rel of relFiles) {
      fs.rmSync(path.join(modsDir, rel), { force: true });
    }
    await extractSelected(archivePath, modsDir, { prefix, names: candidates.map((e) => e.name) });

    const registry = readRegistry(deps, port.id);
    registry[entry.id] = {
      version: entry.version ?? file.version ?? null,
      updatedAt: entry.updatedAt ?? file.addedAt,
      files: relFiles,
    };
    writeRegistry(deps, port.id, registry);
  } finally {
    fs.rmSync(archivePath, { force: true });
  }
}

export async function installMod(
  deps: ModsDeps,
  port: PortConfig,
  installed: InstalledPort,
  modId: string,
): Promise<ModCatalog> {
  const config = port.mods;
  if (!config) {
    throw new AppError('UNKNOWN', 'This port has no mod support');
  }
  const { entries } = await fetchCatalog(config);
  const entry = entries.find((e) => e.id === modId);
  if (!entry) {
    throw new AppError('UNKNOWN', `Unknown mod: ${modId}`);
  }
  if (config.source.kind === 'gamebanana') {
    await installFromGamebanana(deps, port, installed, config, entry);
  } else {
    await installFromIndex(deps, port, installed, config, entry);
  }
  return getMods(deps, port, installed);
}

function pruneEmptyDirs(dir: string): void {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const full = path.join(dir, entry.name);
      pruneEmptyDirs(full);
      try {
        fs.rmdirSync(full);
      } catch {
        // not empty
      }
    }
  }
}

export async function uninstallMod(
  deps: ModsDeps,
  port: PortConfig,
  installed: InstalledPort,
  modId: string,
): Promise<ModCatalog> {
  const config = port.mods;
  if (!config) {
    throw new AppError('UNKNOWN', 'This port has no mod support');
  }
  const modsDir = resolveModsDir(deps.platform, installed, config);
  if (config.layout === 'flat-files') {
    const registry = readRegistry(deps, port.id);
    const record = registry[modId];
    if (!record) {
      throw new AppError('UNKNOWN', `Mod '${modId}' is not installed`);
    }
    for (const rel of record.files) {
      fs.rmSync(path.join(modsDir, rel), { force: true });
    }
    pruneEmptyDirs(modsDir);
    delete registry[modId];
    writeRegistry(deps, port.id, registry);
    return getMods(deps, port, installed);
  }
  const destDir = path.join(modsDir, modId);
  if (!fs.existsSync(destDir)) {
    throw new AppError('UNKNOWN', `Mod '${modId}' is not installed`);
  }
  fs.rmSync(destDir, { recursive: true, force: true });
  return getMods(deps, port, installed);
}
