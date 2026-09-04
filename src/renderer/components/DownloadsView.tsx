import { useStore } from '../store';
import type { InstallProgress } from '../../shared/types';

function stageLabel(progress: InstallProgress | undefined): string {
  switch (progress?.stage) {
    case 'queued':
      return 'Waiting in queue…';
    case 'checking-release':
      return 'Checking release…';
    case 'downloading':
      return 'Downloading…';
    case 'extracting':
      return 'Extracting…';
    case 'finalizing':
      return 'Finalizing…';
    default:
      return 'Working…';
  }
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '—';
  const mb = bytes / 1048576;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function DownloadsView() {
  const installs = useStore((s) => s.installs);
  const busyInstalls = useStore((s) => s.busyInstalls);
  const library = useStore((s) => s.library);
  const downloadsLog = useStore((s) => s.downloadsLog);
  const clearDownloadsLog = useStore((s) => s.clearDownloadsLog);
  const cancelInstall = useStore((s) => s.cancelInstall);
  const setView = useStore((s) => s.setView);

  const activeIds = Object.keys(busyInstalls);
  const nameFor = (portId: string) =>
    library.find((l) => l.port.id === portId)?.port.displayName ?? portId;

  return (
    <div className="view downloads-view">
      <div className="view-title">Downloads</div>

      <div className="downloads-section">
        <div className="downloads-section-title">
          Active <span className="pill pill-version">{activeIds.length}</span>
        </div>
        {activeIds.length === 0 ? (
          <div className="mods-empty">No active downloads.</div>
        ) : (
          activeIds.map((portId) => {
            const progress = installs[portId];
            const percent =
              progress && progress.totalBytes > 0 ? Math.min(100, Math.max(0, progress.percent)) : null;
            return (
              <div key={portId} className="download-item">
                <div className="download-item-icon">
                  <div className="download-spinner" />
                </div>
                <div className="download-item-main">
                  <div className="download-item-name">{nameFor(portId)}</div>
                  <div className="download-item-stage">
                    {stageLabel(progress)}
                    {progress?.stage === 'downloading' && progress.totalBytes > 0 && (
                      <span className="download-item-bytes">
                        {(progress.downloadedBytes / 1048576).toFixed(1)} / {(progress.totalBytes / 1048576).toFixed(1)} MB
                      </span>
                    )}
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${percent === null ? 'indeterminate' : ''}`}
                      style={percent !== null ? { width: `${percent}%` } : undefined}
                    />
                  </div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => void cancelInstall(portId)}>
                  Cancel
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="downloads-section">
        <div className="downloads-section-title-row">
          <div className="downloads-section-title">Completed</div>
          {downloadsLog.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={clearDownloadsLog}>
              Clear history
            </button>
          )}
        </div>
        {downloadsLog.length === 0 ? (
          <div className="mods-empty">Nothing downloaded yet this session.</div>
        ) : (
          downloadsLog.map((record) => (
            <div key={record.id} className="download-item download-item-done">
              <div className={`download-item-icon ${record.ok ? 'download-done' : 'download-cancelled'}`}>
                {record.ok ? (
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className="download-item-main">
                <div className="download-item-name">
                  {record.name}
                  <span className={`badge ${record.ok ? '' : 'badge-warn'}`}>
                    {record.ok ? 'Installed' : 'Cancelled'}
                  </span>
                </div>
                <div className="download-item-stage">
                  {formatBytes(record.sizeBytes)} · {new Date(record.finishedAt).toLocaleString()}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setView('library')}>
                View in library
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
