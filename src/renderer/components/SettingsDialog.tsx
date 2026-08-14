import { useState } from 'react';
import { useStore } from '../store';

export function SettingsDialog() {
  const settings = useStore((s) => s.settings);
  const library = useStore((s) => s.library);
  const setSettingsDialogOpen = useStore((s) => s.setSettingsDialogOpen);
  const saveSettings = useStore((s) => s.saveSettings);
  const setPortDirOverride = useStore((s) => s.setPortDirOverride);
  const pickDirectory = useStore((s) => s.pickDirectory);

  const [rootDir, setRootDir] = useState(settings?.rootInstallDir ?? '');
  const [token, setToken] = useState(settings?.githubToken ?? '');
  const [saved, setSaved] = useState(false);

  const installed = library.filter((l) => l.installed);

  const save = async () => {
    await saveSettings({ rootInstallDir: rootDir.trim(), githubToken: token.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const browse = async () => {
    const dir = await pickDirectory();
    if (dir) setRootDir(dir);
  };

  const changePortDir = async (portId: string) => {
    const dir = await pickDirectory();
    if (dir) {
      await setPortDirOverride(portId, dir);
    }
  };

  return (
    <div className="overlay">
      <div className="modal modal-wide">
        <div className="modal-title">Settings</div>

        <label className="settings-row">
          <span className="settings-label">Install directory</span>
          <div className="settings-input-group">
            <input className="input" value={rootDir} onChange={(e) => setRootDir(e.target.value)} />
            <button className="btn btn-ghost" onClick={() => void browse()}>
              Browse…
            </button>
          </div>
        </label>

        <label className="settings-row">
          <span className="settings-label">GitHub token (optional)</span>
          <input
            className="input"
            type="password"
            placeholder="Personal access token to raise API rate limits"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </label>

        {installed.length > 0 && (
          <div className="settings-section">
            <div className="settings-section-title">Per-port directory overrides</div>
            {installed.map((l) => (
              <div key={l.port.id} className="settings-row">
                <span className="settings-label">{l.port.displayName}</span>
                <div className="settings-input-group">
                  <span className="settings-override-path">
                    {settings?.portDirOverrides[l.port.id] ?? l.installed!.installPath}
                  </span>
                  <button className="btn btn-ghost" onClick={() => void changePortDir(l.port.id)}>
                    Change…
                  </button>
                  {settings?.portDirOverrides[l.port.id] && (
                    <button className="btn btn-ghost" onClick={() => void setPortDirOverride(l.port.id, null)}>
                      Reset
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          {saved && <span className="saved-hint">Saved</span>}
          <button className="btn btn-ghost" onClick={() => setSettingsDialogOpen(false)}>
            Close
          </button>
          <button className="btn btn-primary" onClick={() => void save()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
