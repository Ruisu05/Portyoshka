import { useStore } from '../store';
import { PortCard } from './PortCard';
import { LaunchOutputPanel } from './LaunchOutputPanel';
import { iconUrl } from '../icons';
import type { PortConfig } from '../../shared/types';

export function LibraryView() {
  const library = useStore((s) => s.library);
  const setView = useStore((s) => s.setView);

  const installed = library.filter((entry) => entry.installed);

  if (installed.length === 0) {
    return (
      <div className="view">
        <div className="empty-state empty-center">
          <div className="empty-title">No ports installed yet</div>
          <div className="empty-text">Pick a fan-made PC port to install and launch.</div>
          <button className="btn btn-accent btn-lg" onClick={() => setView('catalog')}>
            Add your first port
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      <div className="grid">
        {installed.map((entry) => (
          <div key={entry.port.id} className="grid-cell">
            <PortCard entry={entry} />
            <LaunchOutputPanel entry={entry} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CatalogView() {
  const catalog = useStore((s) => s.catalog);
  const install = useStore((s) => s.install);
  const busyInstalls = useStore((s) => s.busyInstalls);
  const installs = useStore((s) => s.installs);

  if (catalog.length === 0) {
    return (
      <div className="view">
        <div className="empty-state">
          <div className="empty-title">Nothing to add</div>
          <div className="empty-text">Every supported port is already installed.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      <div className="view-title">Add a port</div>
      <div className="grid">
        {catalog.map((port: PortConfig) => {
          const busy = busyInstalls[port.id];
          const progress = installs[port.id];
          const percent = progress && progress.totalBytes > 0 ? progress.percent : null;
          const icon = iconUrl(port.icon);
          return (
            <div key={port.id} className="card">
              <div className="card-top">
                <div className="icon-tile">
                  {icon ? (
                    <img className="icon-img" src={icon} alt="" />
                  ) : (
                    port.displayName.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/)[0]?.[0] ?? '?'
                  )}
                </div>
                <div className="card-info">
                  <div className="card-name">{port.displayName}</div>
                  <div className="card-status">Not installed</div>
                  {port.description && <div className="card-desc">{port.description}</div>}
                </div>
              </div>
              {busy && (
                <div className="progress-block">
                  <div className="progress-stage">
                    {progress?.stage === 'queued' && 'Waiting in queue…'}
                    {progress?.stage === 'downloading' && 'Downloading…'}
                    {progress?.stage === 'extracting' && 'Extracting…'}
                    {progress?.stage === 'finalizing' && 'Finalizing…'}
                    {progress?.stage === 'checking-release' && 'Checking release…'}
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${percent === null ? 'indeterminate' : ''}`}
                      style={percent !== null ? { width: `${percent}%` } : undefined}
                    />
                  </div>
                </div>
              )}
              <div className="card-actions">
                <button className="btn btn-accent" disabled={busy} onClick={() => void install(port.id)}>
                  {busy ? 'Installing…' : 'Install'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
