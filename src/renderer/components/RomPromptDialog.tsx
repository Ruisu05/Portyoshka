import { useState } from 'react';
import { useStore } from '../store';

export function RomPromptDialog() {
  const romPrompt = useStore((s) => s.romPrompt);
  const library = useStore((s) => s.library);
  const attachRom = useStore((s) => s.attachRom);
  const closeRomPrompt = useStore((s) => s.closeRomPrompt);
  const launch = useStore((s) => s.launch);
  const [working, setWorking] = useState(false);

  if (!romPrompt) return null;
  const entry = library.find((l) => l.port.id === romPrompt.portId);
  if (!entry) return null;
  const port = entry.port;
  const replacing = entry.romStatus.linked;

  const onPick = async () => {
    setWorking(true);
    const success = await attachRom(port.id);
    setWorking(false);
    if (success && romPrompt.autoLaunch) {
      closeRomPrompt();
      void launch(port.id);
    }
  };

  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-title">
          {replacing ? `Change ROM — ${port.displayName}` : `Attach ROM — ${port.displayName}`}
        </div>
        {replacing ? (
          <>
            <div className="modal-text">
              Current ROM:{' '}
              <span className="rom-current">
                {entry.romStatus.rom ? entry.romStatus.rom.sourcePath : 'unknown'}
              </span>
            </div>
            <div className="modal-text">
              Pick a different dump to replace it. The new file is validated against the supported hash list
              before it is accepted.
            </div>
          </>
        ) : (
          <div className="modal-text">
            This port needs game assets from your own legally dumped ROM copy. Portyoshka only validates and caches it
            locally — nothing is uploaded or shared.
          </div>
        )}
        <div className="modal-text">Accepted extensions: {port.rom.acceptedExtensions.join(', ')}</div>
        <div className="modal-actions">
          <button className="btn btn-ghost" disabled={working} onClick={closeRomPrompt}>
            Cancel
          </button>
          <button className="btn btn-accent" disabled={working} onClick={() => void onPick()}>
            {working ? 'Validating…' : replacing ? 'Choose different ROM…' : 'Choose ROM file…'}
          </button>
        </div>
      </div>
    </div>
  );
}
