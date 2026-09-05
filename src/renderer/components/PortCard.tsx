import type { LibraryEntry } from '../../shared/types';
import { useStore } from '../store';
import { iconUrl } from '../icons';

function initials(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function formatPlaytime(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 60) {
    return `${Math.max(totalMinutes, 1)}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function romMissing(entry: LibraryEntry): boolean {
  return entry.port.rom.required && !entry.romStatus.linked;
}

function displayVersion(version: string): string {
  return `v${version.replace(/^v/, '')}`;
}

export function PlayIcon({ size = 12 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M5 3l14 9-14 9V3z" />
    </svg>
  );
}

function ClockIcon({ size = 10 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" />
    </svg>
  );
}

function SteamIcon({ remove }: { remove?: boolean }) {
  return (
    <span className="steam-icon-wrap">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
      </svg>
      {remove && (
        <svg className="steam-icon-x" viewBox="0 0 10 10" width="9" height="9">
          <path d="M1 1l8 8M9 1l-8 8" stroke="#e5484d" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </svg>
      )}
    </span>
  );
}

export interface PrimaryAction {
  label: string;
  kind: 'primary' | 'accent' | 'danger';
  onClick: () => void;
}

export function usePrimaryAction(entry: LibraryEntry): PrimaryAction {
  const busyInstalls = useStore((s) => s.busyInstalls);
  const install = useStore((s) => s.install);
  const cancelInstall = useStore((s) => s.cancelInstall);
  const launch = useStore((s) => s.launch);
  const stopLaunch = useStore((s) => s.stopLaunch);

  const busy = busyInstalls[entry.port.id] ?? false;
  const running = entry.running;

  if (running) {
    return { label: 'Stop', kind: 'danger', onClick: () => void stopLaunch(entry.port.id) };
  }
  if (busy) {
    return { label: 'Cancel', kind: 'danger', onClick: () => void cancelInstall(entry.port.id) };
  }
  if (!entry.installed) {
    return { label: 'Install', kind: 'accent', onClick: () => void install(entry.port.id) };
  }
  if (entry.updateAvailable) {
    return {
      label: `Update to ${entry.latestVersion ?? ''}`,
      kind: 'accent',
      onClick: () => void install(entry.port.id),
    };
  }
  return { label: 'Play', kind: 'primary', onClick: () => void launch(entry.port.id) };
}

export function useInstallProgress(entry: LibraryEntry) {
  const installs = useStore((s) => s.installs);
  const busyInstalls = useStore((s) => s.busyInstalls);
  const progress = installs[entry.port.id];
  const busy = busyInstalls[entry.port.id] ?? false;
  const percent = progress && progress.totalBytes > 0 ? Math.min(100, Math.max(0, progress.percent)) : null;
  return { progress, busy, percent };
}

export function ProgressBlock({ entry }: { entry: LibraryEntry }) {
  const { progress, busy, percent } = useInstallProgress(entry);
  if (!progress || !busy) return null;
  return (
    <div className="progress-block">
      <div className="progress-stage">
        {progress.stage === 'queued' && 'Waiting in queue…'}
        {progress.stage === 'downloading' && 'Downloading…'}
        {progress.stage === 'extracting' && 'Extracting…'}
        {progress.stage === 'finalizing' && 'Finalizing…'}
        {progress.stage === 'checking-release' && 'Checking release…'}
      </div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${percent === null ? 'indeterminate' : ''}`}
          style={percent !== null ? { width: `${percent}%` } : undefined}
        />
      </div>
      {progress.stage === 'downloading' && progress.totalBytes > 0 && (
        <div className="progress-bytes">
          {(progress.downloadedBytes / 1048576).toFixed(1)} MB / {(progress.totalBytes / 1048576).toFixed(1)} MB
        </div>
      )}
    </div>
  );
}

export function StatusPill({ entry }: { entry: LibraryEntry }) {
  if (!entry.installed) {
    return (
      <span className="status-pill status-neutral">
        <span className="status-dot" />
        Not installed
      </span>
    );
  }
  if (entry.running) {
    return (
      <span className="status-pill status-running">
        <span className="status-dot" />
        Running
      </span>
    );
  }
  if (romMissing(entry)) {
    return (
      <span className="status-pill status-warn">
        <span className="status-dot" />
        ROM not attached
      </span>
    );
  }
  if (entry.romStatus.unverified) {
    return (
      <span className="status-pill status-neutral" title="No published hash list for this port yet">
        <span className="status-dot" />
        ROM unverified
      </span>
    );
  }
  if (entry.updateAvailable) {
    return (
      <span className="status-pill status-update">
        <span className="status-dot" />
        Update available
      </span>
    );
  }
  return (
    <span className="status-pill status-ready">
      <span className="status-dot" />
      Ready
    </span>
  );
}

export function PortIconActions({ entry }: { entry: LibraryEntry }) {
  const showFolder = useStore((s) => s.showFolder);
  const openRepo = useStore((s) => s.openRepo);
  const addToSteam = useStore((s) => s.addToSteam);
  const openUninstallPrompt = useStore((s) => s.openUninstallPrompt);

  if (!entry.installed) return null;

  return (
    <>
      <button className="icon-btn" title="Open game directory" onClick={() => void showFolder(entry.port.id)}>
        <FolderIcon />
      </button>
      <button className="icon-btn" title="GitHub repository" onClick={() => void openRepo(entry.port.id)}>
        <GitHubIcon />
      </button>
      <button
        className="icon-btn"
        title={entry.inSteam ? 'Remove from Steam' : 'Add Steam shortcut'}
        onClick={() => void addToSteam(entry.port.id)}
      >
        <SteamIcon remove={entry.inSteam} />
      </button>
      {!entry.running && (
        <button
          className="icon-btn icon-btn-danger"
          title="Uninstall"
          onClick={() => openUninstallPrompt(entry.port.id)}
        >
          <TrashIcon />
        </button>
      )}
    </>
  );
}

function PortIcon({ entry, small }: { entry: LibraryEntry; small?: boolean }) {
  const icon = iconUrl(entry.port.icon);
  return (
    <div className={`icon-tile ${small ? 'icon-tile-sm' : ''}`}>
      {icon ? <img className="icon-img" src={icon} alt="" /> : initials(entry.port.displayName)}
    </div>
  );
}

export function PortCard({ entry }: { entry: LibraryEntry }) {
  const primary = usePrimaryAction(entry);
  const { busy } = useInstallProgress(entry);
  const toggleLog = useStore((s) => s.toggleLog);
  const visibleLogs = useStore((s) => s.visibleLogs);
  const openMods = useStore((s) => s.openMods);
  const openRomPrompt = useStore((s) => s.openRomPrompt);
  const missing = romMissing(entry);
  const running = entry.running;
  const installed = entry.installed !== null;

  return (
    <div className="card port-card">
      <div className="card-top">
        <PortIcon entry={entry} />
        <div className="card-info">
          <div className="card-name-row">
            <div className="card-name">{entry.port.displayName}</div>
            <StatusPill entry={entry} />
          </div>
          {entry.port.description && <div className="card-desc">{entry.port.description}</div>}
          <div className="card-meta">
            {entry.installed && <span className="pill pill-version">{displayVersion(entry.installed.version)}</span>}
            {entry.playtimeMs > 0 && (
              <span
                className="pill"
                title={
                  entry.lastPlayedAt > 0
                    ? `Last played ${new Date(entry.lastPlayedAt).toLocaleString()}`
                    : undefined
                }
              >
                <ClockIcon />
                {formatPlaytime(entry.playtimeMs)} played
              </span>
            )}
            {entry.installed && entry.playtimeMs === 0 && (
              <span className="pill pill-dim">Not played yet</span>
            )}
          </div>
        </div>
      </div>

      <ProgressBlock entry={entry} />

      <div className="card-actions port-actions">
        <button className={`btn btn-${primary.kind}`} onClick={primary.onClick}>
          {primary.kind === 'primary' && <PlayIcon />}
          {primary.label}
        </button>
        {installed && !busy && !entry.port.noOutput && (
          <button className="btn btn-ghost" onClick={() => toggleLog(entry.port.id)}>
            {visibleLogs[entry.port.id] ? 'Hide output' : 'Output'}
          </button>
        )}
        {installed && !busy && entry.port.mods && (
          <button className="btn btn-ghost" onClick={() => openMods(entry.port.id)}>
            Mods
          </button>
        )}
        {missing && installed && !busy && !running ? (
          <button className="btn btn-ghost btn-rom" onClick={() => openRomPrompt(entry.port.id, false)}>
            <LinkIcon />
            Attach ROM
          </button>
        ) : (
          !missing && entry.port.rom.required && installed && !busy && !running && (
            <button
              className="btn btn-ghost"
              title={`Current ROM: ${entry.romStatus.rom?.sourcePath ?? ''}`}
              onClick={() => openRomPrompt(entry.port.id, false)}
            >
              Change ROM
            </button>
          )
        )}
        <div className="card-icon-actions">
          <PortIconActions entry={entry} />
        </div>
      </div>
    </div>
  );
}

export function PortRow({ entry }: { entry: LibraryEntry }) {
  const primary = usePrimaryAction(entry);

  return (
    <div className="port-row">
      <PortIcon entry={entry} small />
      <div className="port-row-main">
        <div className="card-name">{entry.port.displayName}</div>
        {entry.port.description && <div className="card-desc">{entry.port.description}</div>}
      </div>
      <StatusPill entry={entry} />
      <div className="port-row-meta">
        {entry.installed && <span className="pill pill-version">{displayVersion(entry.installed.version)}</span>}
        {entry.playtimeMs > 0 && (
          <span className="pill">
            <ClockIcon />
            {formatPlaytime(entry.playtimeMs)}
          </span>
        )}
      </div>
      <div className="port-row-actions">
        <button className={`btn btn-sm btn-${primary.kind}`} onClick={primary.onClick}>
          {primary.label}
        </button>
        <div className="card-icon-actions">
          <PortIconActions entry={entry} />
        </div>
      </div>
    </div>
  );
}
