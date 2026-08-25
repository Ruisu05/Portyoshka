import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { hasModUpdate, latestVersionFor } from '../../shared/mods';
import type { LibraryEntry, ModInfo } from '../../shared/types';

function thumbUrl(entry: LibraryEntry, thumbnail: string | undefined): string | null {
  if (!thumbnail) {
    return null;
  }
  if (/^https?:\/\//.test(thumbnail)) {
    return thumbnail;
  }
  const source = entry.port.mods?.source;
  if (source?.kind !== 'index') {
    return null;
  }
  const base = source.indexUrl.replace(/\/?data\/index\.json$/, '');
  return `${base}/${thumbnail.replace(/^\/+/, '')}`;
}

export function ModsView() {
  const library = useStore((s) => s.library);
  const modsPortId = useStore((s) => s.modsPortId);
  const setModsPort = useStore((s) => s.setModsPort);
  const catalog = useStore((s) => (modsPortId ? s.modsCatalog[modsPortId] : undefined));
  const loading = useStore((s) => (modsPortId ? s.modsLoading[modsPortId] ?? false : false));
  const busy = useStore((s) => (modsPortId ? s.modsBusy[modsPortId] ?? false : false));
  const refreshMods = useStore((s) => s.refreshMods);
  const installMod = useStore((s) => s.installMod);
  const uninstallMod = useStore((s) => s.uninstallMod);
  const setView = useStore((s) => s.setView);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const ports = library.filter((e) => e.installed && e.port.mods);
  const entry = ports.find((e) => e.port.id === modsPortId) ?? ports[0];

  useEffect(() => {
    if (entry && entry.port.id !== modsPortId) {
      setModsPort(entry.port.id);
    }
  }, [entry, modsPortId, setModsPort]);

  if (ports.length === 0 || !entry) {
    return (
      <div className="view">
        <div className="empty-state">
          <div className="empty-title">No mods here yet</div>
          <div className="empty-text">No installed port supports mods. Install a port like Gen1Recomp first.</div>
          <button className="btn btn-accent btn-lg" onClick={() => setView('catalog')}>
            Add a port
          </button>
        </div>
      </div>
    );
  }

  const list = (catalog?.mods ?? []).filter((mod) => {
    if (category && !mod.categories?.some((c) => c === category)) {
      return false;
    }
    return (
      query.trim() === '' ||
      `${mod.title} ${mod.author ?? ''} ${mod.summary ?? ''} ${mod.id}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    );
  });

  return (
    <div className="view">
      <div className="mods-port-tabs">
        {ports.map((p) => (
          <button
            key={p.port.id}
            className={`btn btn-nav ${p.port.id === entry.port.id ? 'active' : ''}`}
            onClick={() => setModsPort(p.port.id)}
          >
            {p.port.displayName}
          </button>
        ))}
      </div>

      <div className="mods-toolbar">
        <div className="mods-toolbar-top">
          <input
            className="input mods-search"
            type="text"
            placeholder="Search mods…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="btn btn-ghost"
            disabled={loading || busy}
            title="Refresh the mod list"
            onClick={() => void refreshMods(entry.port.id)}
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {catalog && catalog.categories.length > 0 && (
          <div className="mods-categories">
            <button
              className={`category-chip ${category === null ? 'active' : ''}`}
              onClick={() => setCategory(null)}
            >
              All
            </button>
            {catalog.categories.map((c) => (
              <button
                key={c}
                className={`category-chip ${category === c ? 'active' : ''}`}
                onClick={() => setCategory(category === c ? null : c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {catalog === undefined && loading && <div className="mods-empty">Loading mods…</div>}
      {catalog === undefined && !loading && (
        <div className="mods-empty">Could not load the mod directory.</div>
      )}
      {catalog !== undefined && list.length === 0 && (
        <div className="mods-empty">{query || category ? 'No mods match the filters.' : 'No mods listed.'}</div>
      )}

      <div className="mods-grid">
        {list.map((mod) => (
          <ModCard
            key={mod.id}
            entry={entry}
            mod={mod}
            busy={busy}
            onInstall={() => void installMod(entry.port.id, mod.id)}
            onUninstall={() => void uninstallMod(entry.port.id, mod.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  );
}

function ModCard({
  entry,
  mod,
  busy,
  onInstall,
  onUninstall,
}: {
  entry: LibraryEntry;
  mod: ModInfo;
  busy: boolean;
  onInstall: () => void;
  onUninstall: () => void;
}) {
  const openModPage = useStore((s) => s.openModPage);
  const installed = mod.installedVersion !== null;
  const update = hasModUpdate(mod);
  const latest = latestVersionFor(mod);
  const thumbnail = thumbUrl(entry, mod.thumbnail);
  const pageUrl = mod.pageUrl;

  let button: React.ReactNode;
  if (installed && update) {
    button = (
      <button className="btn btn-accent btn-sm" disabled={busy} onClick={onInstall}>
        Update to {latest}
      </button>
    );
  } else if (installed) {
    button = (
      <button className="btn btn-ghost btn-sm" disabled={busy} title="Remove this mod" onClick={onUninstall}>
        Remove
      </button>
    );
  } else {
    button = (
      <button className="btn btn-accent btn-sm" disabled={busy} onClick={onInstall}>
        Install
      </button>
    );
  }

  return (
    <div className="card mod-card">
      <div className="mod-card-thumb">
        <span className="mod-card-placeholder">{mod.title.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'}</span>
        {thumbnail && (
          <img
            className="mod-card-img"
            src={thumbnail}
            alt=""
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>
      <div className="card-info">
        <div className="card-name">
          {mod.title}
          {mod.author && <span className="mod-row-author">by {mod.author}</span>}
        </div>
        {mod.categories && mod.categories.length > 0 && (
          <div className="mod-row-sub">
            {mod.categories.map((c) => (
              <span key={c} className="badge">
                {c}
              </span>
            ))}
          </div>
        )}
        {mod.summary && <div className="card-desc mod-summary">{mod.summary}</div>}
      </div>
      <div className="card-actions">
        {installed && <span className="mod-row-installed">v{mod.installedVersion}</span>}
        <div className="mod-card-spacer" />
        {pageUrl && (
          <button
            className="icon-btn"
            title="Open the mod page"
            onClick={() => void openModPage(pageUrl)}
          >
            <ExternalLinkIcon />
          </button>
        )}
        {button}
      </div>
    </div>
  );
}
