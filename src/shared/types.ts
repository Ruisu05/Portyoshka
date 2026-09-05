export type Platform = 'windows' | 'macos' | 'linux';

export type RomHandling = 'native-wizard' | 'copy-to-working-dir' | 'copy-to-exe-dir' | 'cli-arg';

export interface RomSpec {
  required: boolean;
  acceptedExtensions: string[];
  validHashes: {
    sha1: string[];
    md5?: string[];
  };
  handling: RomHandling;
  filename?: string;
  cliArg?: string;
}

export type ModSourceConfig =
  | { kind: 'index'; indexUrl: string; fallbackIndexUrl?: string }
  | { kind: 'gamebanana'; gameId: number };

export interface PortModsConfig {
  source: ModSourceConfig;
  layout: 'folder-per-mod' | 'flat-files';
  appDataFolder?: string;
  portableMarker?: string;
  modFileExtensions?: string[];
}

export interface ModZipInfo {
  name?: string;
  url?: string;
  size?: number;
}

export interface ModReleaseInfo {
  version?: string;
  tag?: string;
  zip?: ModZipInfo | null;
}

export interface ModIndexEntry {
  id: string;
  title: string;
  author?: string;
  version?: string;
  summary?: string;
  categories?: string[];
  downloadURL?: string;
  latest?: ModReleaseInfo | null;
  thumbnail?: string;
  updatedAt?: number;
  pageUrl?: string;
}

export interface ModInfo extends ModIndexEntry {
  installedVersion: string | null;
  installedUpdatedAt: number | null;
}

export interface ModCatalog {
  categories: string[];
  mods: ModInfo[];
}

export interface PortConfig {
  id: string;
  displayName: string;
  repo: string;
  repoHost?: 'github' | 'gitlab';
  description?: string;
  icon?: string;
  assetPattern: Partial<Record<Platform, string>>;
  executable: Partial<Record<Platform, string>>;
  rom: RomSpec;
  preserveOnUpdate: string[];
  notes?: string;
  noOutput?: boolean;
  mods?: PortModsConfig;
}

export interface ReleaseAsset {
  name: string;
  browserDownloadUrl: string;
  size: number;
  digest?: string;
  contentType?: string;
}

export interface ReleaseInfo {
  tag: string;
  name: string;
  publishedAt: string;
  assets: ReleaseAsset[];
}

export type InstallStage =
  | 'queued'
  | 'checking-release'
  | 'downloading'
  | 'extracting'
  | 'finalizing'
  | 'done'
  | 'cancelled';

export interface InstallProgress {
  portId: string;
  stage: InstallStage;
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  message?: string;
}

export interface InstalledPort {
  id: string;
  version: string;
  installPath: string;
  executablePath: string;
  updatedAt: number;
}

export interface RomRecord {
  sha1: string;
  md5: string;
  sourcePath: string;
  cachedPath: string;
  extension: string;
  size: number;
  validatedAt: number;
}

export interface RomStatus {
  linked: boolean;
  unverified: boolean;
  rom: RomRecord | null;
}

export type ErrorCode =
  | 'NETWORK_OFFLINE'
  | 'RATE_LIMITED'
  | 'API_ERROR'
  | 'NO_RELEASE'
  | 'NO_ASSET'
  | 'DOWNLOAD_FAILED'
  | 'DOWNLOAD_INCOMPLETE'
  | 'CHECKSUM_MISMATCH'
  | 'EXTRACT_FAILED'
  | 'EXTRACT_UNSUPPORTED'
  | 'EXECUTABLE_MISSING'
  | 'ROM_EXTENSION_UNSUPPORTED'
  | 'ROM_HASH_MISMATCH'
  | 'ROM_READ_FAILED'
  | 'ROM_NOT_ATTACHED'
  | 'ROM_COPY_FAILED'
  | 'LAUNCH_FAILED'
  | 'ALREADY_RUNNING'
  | 'INSTALL_BUSY'
  | 'CANCELLED'
  | 'DISK_FULL'
  | 'STEAM_NOT_FOUND'
  | 'STEAM_RUNNING'
  | 'ALREADY_EXISTS'
  | 'UNKNOWN';

export interface AppErrorInfo {
  code: ErrorCode;
  message: string;
  detail?: string;
}

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: AppErrorInfo };

export interface LibraryEntry {
  port: PortConfig;
  installed: InstalledPort | null;
  updateAvailable: boolean;
  latestVersion: string | null;
  romStatus: RomStatus;
  running: boolean;
  playtimeMs: number;
  lastPlayedAt: number;
  inSteam: boolean;
}

export interface UpdateCheckResult {
  portId: string;
  installedVersion: string | null;
  latestVersion: string;
  hasUpdate: boolean;
  error: AppErrorInfo | null;
}

export interface SelfUpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  error: AppErrorInfo | null;
}

export interface UpdateCheckResponse {
  ports: UpdateCheckResult[];
  self: SelfUpdateInfo;
}

export type SelfUpdateStage = 'downloading' | 'preparing' | 'opening';

export interface SelfUpdateProgress {
  stage: SelfUpdateStage;
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  message?: string;
}

export interface SettingsData {
  rootInstallDir: string;
  githubToken: string;
  portDirOverrides: Record<string, string>;
  version: string;
}

export type MainEvent =
  | { type: 'install-progress'; progress: InstallProgress }
  | { type: 'self-update-progress'; progress: SelfUpdateProgress }
  | { type: 'launch-output'; portId: string; stream: 'stdout' | 'stderr'; data: string }
  | { type: 'launch-exit'; portId: string; code: number | null; signal: string | null; failed: boolean }
  | { type: 'launch-restarted'; portId: string };

export interface PortyoshkaApi {
  getLibrary(): Promise<IpcResult<LibraryEntry[]>>;
  getCatalog(): Promise<IpcResult<PortConfig[]>>;
  checkForUpdates(force?: boolean): Promise<IpcResult<UpdateCheckResponse>>;
  installUpdate(): Promise<IpcResult<null>>;
  startInstall(portId: string): Promise<IpcResult<null>>;
  cancelInstall(portId: string): Promise<IpcResult<null>>;
  pickRom(portId: string): Promise<IpcResult<RomStatus>>;
  getRomStatus(portId: string): Promise<IpcResult<RomStatus>>;
  launch(portId: string): Promise<IpcResult<null>>;
  stopLaunch(portId: string): Promise<IpcResult<null>>;
  showFolder(portId: string): Promise<IpcResult<null>>;
  openRepo(portId: string): Promise<IpcResult<null>>;
  addSteamShortcut(portId: string, iconData: ArrayBuffer | null): Promise<IpcResult<string>>;
  removeSteamShortcut(portId: string): Promise<IpcResult<null>>;
  uninstall(portId: string, keepSettings: boolean): Promise<IpcResult<null>>;
  exportLog(portId: string, content: string): Promise<IpcResult<string | null>>;
  openExternal(url: string): Promise<IpcResult<null>>;
  getMods(portId: string): Promise<IpcResult<ModCatalog>>;
  installMod(portId: string, modId: string): Promise<IpcResult<ModCatalog>>;
  uninstallMod(portId: string, modId: string): Promise<IpcResult<ModCatalog>>;
  getSettings(): Promise<IpcResult<SettingsData>>;
  setSettings(patch: Partial<Pick<SettingsData, 'rootInstallDir' | 'githubToken'>>): Promise<IpcResult<SettingsData>>;
  setPortDirOverride(portId: string, dir: string | null): Promise<IpcResult<SettingsData>>;
  pickDirectory(): Promise<IpcResult<string | null>>;
  minimizeWindow(): Promise<IpcResult<null>>;
  toggleMaximizeWindow(): Promise<IpcResult<null>>;
  closeWindow(): Promise<IpcResult<null>>;
  getWindowMaximized(): Promise<IpcResult<boolean>>;
  onWindowStateChange(cb: (maximized: boolean) => void): () => void;
  onEvent(cb: (event: MainEvent) => void): () => void;
}
