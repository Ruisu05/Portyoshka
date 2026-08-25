import { useEffect } from 'react';
import { useStore } from './store';
import { LibraryView, CatalogView } from './components/Views';
import { ModsView } from './components/ModsView';
import { UpdateDialog } from './components/UpdateDialog';
import { RomPromptDialog } from './components/RomPromptDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { UninstallDialog } from './components/UninstallDialog';
import { Toasts } from './components/Toasts';

export function App() {
  const init = useStore((s) => s.init);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const openMods = useStore((s) => s.openMods);
  const checkUpdates = useStore((s) => s.checkUpdates);
  const checkingUpdates = useStore((s) => s.checkingUpdates);
  const setSettingsDialogOpen = useStore((s) => s.setSettingsDialogOpen);
  const updateInfo = useStore((s) => s.updateInfo);
  const selfUpdate = useStore((s) => s.selfUpdate);
  const updateDialogOpen = useStore((s) => s.updateDialogOpen);
  const settingsDialogOpen = useStore((s) => s.settingsDialogOpen);
  const romPrompt = useStore((s) => s.romPrompt);
  const uninstallPrompt = useStore((s) => s.uninstallPrompt);
  const hasModsPorts = useStore((s) => s.library.some((e) => e.installed && e.port.mods));

  useEffect(() => {
    void init();
  }, [init]);

  const updatableCount =
    updateInfo.filter((u) => u.hasUpdate).length + (selfUpdate?.hasUpdate ? 1 : 0);

  return (
    <div className="app">
      <header className="header">
        <div className="header-title">Portyoshka</div>
        <nav className="header-nav">
          <button className={`btn btn-nav ${view === 'library' ? 'active' : ''}`} onClick={() => setView('library')}>
            Library
          </button>
          <button className={`btn btn-nav ${view === 'catalog' ? 'active' : ''}`} onClick={() => setView('catalog')}>
            Add a port
          </button>
          {hasModsPorts && (
            <button className={`btn btn-nav ${view === 'mods' ? 'active' : ''}`} onClick={() => openMods(null)}>
              Mods
            </button>
          )}
        </nav>
        <div className="header-spacer" />
        <button
          className="btn btn-ghost"
          disabled={checkingUpdates}
          onClick={() => void checkUpdates(true)}
          title="Check for updates on GitHub"
        >
          {checkingUpdates ? 'Checking…' : 'Check for updates'}
          {!checkingUpdates && updatableCount > 0 && <span className="badge badge-update">{updatableCount}</span>}
        </button>
        <button className="btn btn-ghost" onClick={() => setSettingsDialogOpen(true)} title="Settings">
          Settings
        </button>
      </header>

      <main className="main">
        {view === 'library' ? <LibraryView /> : view === 'catalog' ? <CatalogView /> : <ModsView />}
      </main>

      {view === 'library' && (
        <button className="fab" title="Add a port" onClick={() => setView('catalog')}>
          <span className="fab-plus">+</span>
          <span className="fab-label">Add a port</span>
        </button>
      )}

      {updateDialogOpen && <UpdateDialog />}
      {romPrompt && <RomPromptDialog />}
      {uninstallPrompt && <UninstallDialog />}
      {settingsDialogOpen && <SettingsDialog />}
      <Toasts />
    </div>
  );
}
