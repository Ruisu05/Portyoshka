import { useState } from 'react';
import { useStore } from '../store';

export function UninstallDialog() {
  const uninstallPrompt = useStore((s) => s.uninstallPrompt);
  const library = useStore((s) => s.library);
  const closeUninstallPrompt = useStore((s) => s.closeUninstallPrompt);
  const uninstall = useStore((s) => s.uninstall);
  const [working, setWorking] = useState(false);

  if (!uninstallPrompt) return null;
  const entry = library.find((l) => l.port.id === uninstallPrompt);
  const name = entry?.port.displayName ?? uninstallPrompt;

  const doUninstall = async (keepSettings: boolean) => {
    setWorking(true);
    await uninstall(uninstallPrompt, keepSettings);
    setWorking(false);
  };

  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-title">Uninstall {name}?</div>
        <div className="modal-text">
          The port files will be removed from your disk. Your ROM stays in Portyoshka&apos;s ROM library and can be
          reused if you reinstall.
        </div>
        <div className="modal-text">
          Settings, saves and mods can be kept as a backup in Portyoshka&apos;s app data folder.
        </div>
        <div className="modal-actions modal-actions-wrap">
          <button className="btn btn-ghost" disabled={working} onClick={closeUninstallPrompt}>
            Cancel
          </button>
          <button className="btn btn-ghost" disabled={working} onClick={() => void doUninstall(true)}>
            Uninstall, keep settings
          </button>
          <button className="btn btn-danger" disabled={working} onClick={() => void doUninstall(false)}>
            Uninstall everything
          </button>
        </div>
      </div>
    </div>
  );
}
