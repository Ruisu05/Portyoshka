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

function statusLabel(entry: LibraryEntry): string {
  if (!entry.installed) return 'Not installed';
  if (entry.running) return 'Running';
  if (entry.updateAvailable) return `Installed ${entry.installed.version} — update ${entry.latestVersion} available`;
  return `Installed ${entry.installed.version}`;
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" />
    </svg>
  );
}

function SteamIcon({ remove }: { remove?: boolean }) {
  return (
    <span className="steam-icon-wrap">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
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

function formatPlaytime(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 60) {
    return `${Math.max(totalMinutes, 1)}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function PortCard({ entry }: { entry: LibraryEntry }) {
  const installs = useStore((s) => s.installs);
  const busyInstalls = useStore((s) => s.busyInstalls);
  const install = useStore((s) => s.install);
  const cancelInstall = useStore((s) => s.cancelInstall);
  const launch = useStore((s) => s.launch);
  const stopLaunch = useStore((s) => s.stopLaunch);
  const openRomPrompt = useStore((s) => s.openRomPrompt);
  const toggleLog = useStore((s) => s.toggleLog);
  const visibleLogs = useStore((s) => s.visibleLogs);
  const openMods = useStore((s) => s.openMods);
  const showFolder = useStore((s) => s.showFolder);
  const openRepo = useStore((s) => s.openRepo);
  const addToSteam = useStore((s) => s.addToSteam);
  const openUninstallPrompt = useStore((s) => s.openUninstallPrompt);

  const progress = installs[entry.port.id];
  const busy = busyInstalls[entry.port.id];
  const romMissing = entry.port.rom.required && !entry.romStatus.linked;
  const running = entry.running;
  const icon = iconUrl(entry.port.icon);

  let primary: { label: string; action: () => void; kind: 'primary' | 'accent' | 'danger' };
  if (running) {
    primary = { label: 'Stop', action: () => void stopLaunch(entry.port.id), kind: 'danger' };
  } else if (!entry.installed || progress?.stage === 'cancelled') {
    primary = {
      label: 'Install',
      action: () => void install(entry.port.id),
      kind: 'accent',
    };
  } else if (busy) {
    primary = {
      label: 'Cancel',
      action: () => void cancelInstall(entry.port.id),
      kind: 'danger',
    };
  } else if (entry.updateAvailable) {
    primary = {
      label: `Update to ${entry.latestVersion}`,
      action: () => void install(entry.port.id),
      kind: 'accent',
    };
  } else {
    primary = { label: 'Play', action: () => void launch(entry.port.id), kind: 'primary' };
  }

  const percent =
    progress && progress.totalBytes > 0 ? Math.min(100, Math.max(0, progress.percent)) : null;

  return (
    <div className="card">
      <div className="card-top">
        <div className="icon-tile">
          {icon ? <img className="icon-img" src={icon} alt="" /> : initials(entry.port.displayName)}
        </div>
        <div className="card-info">
          <div className="card-name">{entry.port.displayName}</div>
          <div className={`card-status ${entry.updateAvailable ? 'status-update' : ''}`}>
            {statusLabel(entry)}
            {romMissing && !busy && !running && entry.installed && (
              <span className="badge badge-warn">ROM not attached</span>
            )}
            {entry.romStatus.unverified && (
              <span className="badge" title="No published hash list for this port yet">
                ROM unverified
              </span>
            )}
            {entry.playtimeMs > 0 && (
              <span
                className="badge"
                title={
                  entry.lastPlayedAt > 0
                    ? `Last played ${new Date(entry.lastPlayedAt).toLocaleString()}`
                    : undefined
                }
              >
                {formatPlaytime(entry.playtimeMs)} played
              </span>
            )}
          </div>
          {entry.port.description && <div className="card-desc">{entry.port.description}</div>}
        </div>
      </div>

      {progress && busy && (
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
      )}

      <div className="card-actions">
        <button className={`btn btn-${primary.kind}`} onClick={primary.action}>
          {primary.label}
        </button>
        {entry.installed && !busy && !entry.port.noOutput && (
          <button className="btn btn-ghost" onClick={() => toggleLog(entry.port.id)}>
            {visibleLogs[entry.port.id] ? 'Hide output' : 'Output'}
          </button>
        )}
        {entry.installed && !busy && entry.port.mods && (
          <button className="btn btn-ghost" onClick={() => openMods(entry.port.id)}>
            Mods
          </button>
        )}
        {romMissing && entry.installed && !busy && !running && (
          <button className="btn btn-ghost" onClick={() => openRomPrompt(entry.port.id, false)}>
            Attach ROM
          </button>
        )}
        {!romMissing && entry.port.rom.required && entry.installed && !busy && !running && (
          <button
            className="btn btn-ghost"
            title={`Current ROM: ${entry.romStatus.rom?.sourcePath ?? ''}`}
            onClick={() => openRomPrompt(entry.port.id, false)}
          >
            Change ROM
          </button>
        )}
        <div className="card-icon-actions">
          {entry.installed && !busy && (
            <>
              <button
                className="icon-btn"
                title="Show folder"
                onClick={() => void showFolder(entry.port.id)}
              >
                <FolderIcon />
              </button>
              <button
                className="icon-btn"
                title="Go to project"
                onClick={() => void openRepo(entry.port.id)}
              >
                <GitHubIcon />
              </button>
              <button
                className="icon-btn"
                title={entry.inSteam ? 'Remove from Steam' : 'Add to Steam'}
                onClick={() => void addToSteam(entry.port.id)}
              >
                <SteamIcon remove={entry.inSteam} />
              </button>
              {!running && (
                <button
                  className="icon-btn icon-btn-danger"
                  title="Uninstall"
                  onClick={() => openUninstallPrompt(entry.port.id)}
                >
                  <TrashIcon />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
