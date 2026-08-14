import { useState } from 'react';
import { useStore } from '../store';

export function UpdateDialog() {
  const updateInfo = useStore((s) => s.updateInfo);
  const library = useStore((s) => s.library);
  const setUpdateDialogOpen = useStore((s) => s.setUpdateDialogOpen);
  const install = useStore((s) => s.install);
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
        {updatable.length === 0 && <div className="modal-text">No updates available.</div>}
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
          <button
            className="btn btn-accent"
            disabled={working || !Object.values(selected).some(Boolean)}
            onClick={() => void updateSelected()}
          >
            Update selected
          </button>
        </div>
      </div>
    </div>
  );
}
