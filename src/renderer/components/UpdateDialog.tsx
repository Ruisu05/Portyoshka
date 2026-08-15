import { useState } from 'react';
import { useStore } from '../store';

export function UpdateDialog() {
  const updateInfo = useStore((s) => s.updateInfo);
  const library = useStore((s) => s.library);
  const selfUpdate = useStore((s) => s.selfUpdate);
  const selfUpdateProgress = useStore((s) => s.selfUpdateProgress);
  const setUpdateDialogOpen = useStore((s) => s.setUpdateDialogOpen);
  const install = useStore((s) => s.install);
  const installUpdate = useStore((s) => s.installUpdate);
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const u of updateInfo) {
      if (u.hasUpdate) init[u.portId] = true;
    }
    return init;
  });
  const [working, setWorking] = useState(false);

  const updatable = updateInfo.filter((u) => u.hasUpdate);
  const nameById = new Map(library.map((l) => [l.port.id, l.port.displayName]));
  const errors = updateInfo.filter((u) => u.error);
  const selfBusy = selfUpdateProgress !== null && working;

  const updateSelected = async () => {
    setWorking(true);
    for (const u of updatable) {
      if (selected[u.portId]) {
        await install(u.portId);
      }
    }
    setWorking(false);
    setUpdateDialogOpen(false);
  };

  const updateSelf = async () => {
    setWorking(true);
    await installUpdate();
    setWorking(false);
  };

  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-title">Updates available</div>
        {errors.length > 0 && (
          <div className="modal-warning">
            Could not check {errors.length} port{errors.length > 1 ? 's' : ''}:{' '}
            {errors.map((e) => e.error?.message).join(' ')}
          </div>
        )}

        {selfUpdate?.hasUpdate && (
          <div className="self-update-block">
            <div className="self-update-row">
              <span className="update-name">Portyoshka</span>
              <span className="update-versions">
                {selfUpdate.currentVersion} → {selfUpdate.latestVersion}
              </span>
              <button
                className="btn btn-accent"
                disabled={working}
                onClick={() => void updateSelf()}
              >
                {selfBusy ? 'Updating…' : 'Update now'}
              </button>
            </div>
            {selfBusy && selfUpdateProgress && (
              <div className="progress-block">
                <div className="progress-stage">
                  {selfUpdateProgress.stage === 'downloading' && 'Downloading update…'}
                  {selfUpdateProgress.stage === 'preparing' && 'Preparing…'}
                  {selfUpdateProgress.stage === 'opening' && 'Opening installer…'}
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${selfUpdateProgress.totalBytes === 0 ? 'indeterminate' : ''}`}
                    style={
                      selfUpdateProgress.totalBytes > 0
                        ? { width: `${selfUpdateProgress.percent}%` }
                        : undefined
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {updatable.length === 0 && !selfUpdate?.hasUpdate && (
          <div className="modal-text">No updates available.</div>
        )}
        {updatable.map((u) => (
          <label key={u.portId} className="update-row">
            <input
              type="checkbox"
              checked={selected[u.portId] ?? false}
              onChange={(e) => setSelected((s) => ({ ...s, [u.portId]: e.target.checked }))}
            />
            <span className="update-name">{nameById.get(u.portId) ?? u.portId}</span>
            <span className="update-versions">
              {u.installedVersion ?? '—'} → {u.latestVersion}
            </span>
          </label>
        ))}
        <div className="modal-actions">
          <button className="btn btn-ghost" disabled={working} onClick={() => setUpdateDialogOpen(false)}>
            Skip
          </button>
          {updatable.length > 0 && (
            <button
              className="btn btn-accent"
              disabled={working || !Object.values(selected).some(Boolean)}
              onClick={() => void updateSelected()}
            >
              Update selected
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
