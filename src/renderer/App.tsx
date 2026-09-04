import { useEffect, useRef } from 'react';
import { useStore } from './store';
import { LibraryView } from './components/Views';
import { ModsView } from './components/ModsView';
import { DownloadsView } from './components/DownloadsView';
import { TitleBar } from './components/TitleBar';
import { UpdateDialog } from './components/UpdateDialog';
import { RomPromptDialog } from './components/RomPromptDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { UninstallDialog } from './components/UninstallDialog';
import { Toasts } from './components/Toasts';

function LibraryTabIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ModsTabIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadsTabIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
  const library = useStore((s) => s.library);
  const settings = useStore((s) => s.settings);
  const refresh = useStore((s) => s.refresh);
  const libraryQuery = useStore((s) => s.libraryQuery);
  const setLibraryQuery = useStore((s) => s.setLibraryQuery);
  const busyInstalls = useStore((s) => s.busyInstalls);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (view !== 'library') {
          setView('library');
        }
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, setView]);

  const updatableCount =
    updateInfo.filter((u) => u.hasUpdate).length + (selfUpdate?.hasUpdate ? 1 : 0);
  const activeDownloads = Object.keys(busyInstalls).length;
  const installedCount = library.filter((l) => l.installed).length;

  return (
    <div className="app">
      <TitleBar />

      <header className="header">
        <div className="brand">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2">
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5M12 2L2 7l10 5 10-5L12 2z" />
            </svg>
          </div>
          <span className="brand-name">Portyoshka</span>
          {settings && <span className="version-pill">v{settings.version}</span>}
        </div>

        <nav className="header-nav">
          <button
            className={`header-tab ${view === 'library' ? 'active' : ''}`}
            onClick={() => setView('library')}
          >
            <LibraryTabIcon />
            <span>Library</span>
          </button>
          <button
            className={`header-tab ${view === 'mods' ? 'active' : ''}`}
            onClick={() => openMods(null)}
          >
            <ModsTabIcon />
            <span>Mods &amp; Tools</span>
          </button>
          <button
            className={`header-tab ${view === 'downloads' ? 'active' : ''}`}
            onClick={() => setView('downloads')}
          >
            <DownloadsTabIcon />
            <span>Downloads</span>
            {activeDownloads > 0 && <span className="tab-badge">{activeDownloads}</span>}
          </button>
        </nav>

        <div className="header-spacer" />

        <div className="search-box">
          <svg
            className="search-icon"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" x2="16.65" y1="21" y2="16.65" />
          </svg>
          <input
            ref={searchRef}
            className="search-input"
            type="text"
            placeholder="Search"
            value={libraryQuery}
            onChange={(e) => setLibraryQuery(e.target.value)}
            onFocus={() => {
              if (view !== 'library') {
                setView('library');
              }
            }}
          />
          <span className="search-kbd">Ctrl K</span>
        </div>

        <button
          className="btn btn-ghost btn-updates"
          disabled={checkingUpdates}
          onClick={() => void checkUpdates(true)}
          title="Check for updates on GitHub"
        >
          <svg
            className={`update-icon ${checkingUpdates ? 'spinning' : ''}`}
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 3v5h-5" />
          </svg>
          {checkingUpdates ? 'Checking…' : 'Check for updates'}
          {!checkingUpdates && updatableCount > 0 && (
            <span className="badge badge-update">{updatableCount}</span>
          )}
        </button>
        <button
          className="btn btn-ghost btn-settings"
          title="Settings"
          onClick={() => setSettingsDialogOpen(true)}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>Settings</span>
        </button>
      </header>

      <main className="main">
        {view === 'library' ? <LibraryView /> : view === 'mods' ? <ModsView /> : <DownloadsView />}
      </main>

      <footer className="statusbar">
        <div className="statusbar-left">
          <span className="statusbar-item">
            <span className="statusbar-dot" />
            {installedCount} port{installedCount === 1 ? '' : 's'} installed
          </span>
          {settings && (
            <>
              <span className="statusbar-sep">|</span>
              <span className="statusbar-item" title={settings.rootInstallDir}>
                Install dir: <span className="statusbar-mono">{settings.rootInstallDir}</span>
              </span>
            </>
          )}
        </div>
        <div className="statusbar-right">
          <button className="statusbar-btn" onClick={() => void refresh()}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Rescan Ports
          </button>
        </div>
      </footer>

      {updateDialogOpen && <UpdateDialog />}
      {romPrompt && <RomPromptDialog />}
      {uninstallPrompt && <UninstallDialog />}
      {settingsDialogOpen && <SettingsDialog />}
      <Toasts />
    </div>
  );
}
