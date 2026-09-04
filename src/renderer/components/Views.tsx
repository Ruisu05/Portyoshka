import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { PortCard, PortRow } from './PortCard';
import { LaunchOutputPanel } from './LaunchOutputPanel';
import type { LibraryEntry } from '../../shared/types';

function romMissing(entry: LibraryEntry): boolean {
  return entry.port.rom.required && !entry.romStatus.linked;
}

function needsAttention(entry: LibraryEntry): boolean {
  return entry.installed !== null && (romMissing(entry) || entry.updateAvailable);
}

function versionParts(value: string | null | undefined): number[] {
  const parts = (value ?? '').replace(/^v/i, '').split(/[^0-9]+/).filter(Boolean);
  return parts.map((p) => Number.parseInt(p, 10) || 0);
}

function compareVersions(a: string | null | undefined, b: string | null | undefined): number {
  const pa = versionParts(a);
  const pb = versionParts(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function LibraryView() {
  const library = useStore((s) => s.library);
  const query = useStore((s) => s.libraryQuery);
  const filter = useStore((s) => s.libraryFilter);
  const setFilter = useStore((s) => s.setLibraryFilter);
  const sort = useStore((s) => s.librarySort);
  const setSort = useStore((s) => s.setLibrarySort);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = library.filter((entry) => {
      if (q) {
        const haystack = `${entry.port.displayName} ${entry.port.description ?? ''} ${
          entry.installed?.version ?? ''
        } ${entry.port.id}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      switch (filter) {
        case 'installed':
          return entry.installed !== null;
        case 'not-installed':
          return entry.installed === null;
        case 'attention':
          return needsAttention(entry);
        default:
          return true;
      }
    });
    list.sort((a, b) => {
      switch (sort) {
        case 'title':
          return a.port.displayName.localeCompare(b.port.displayName);
        case 'version':
          return compareVersions(a.installed?.version, b.installed?.version);
        case 'playtime':
          return b.playtimeMs - a.playtimeMs;
        default:
          return (
            (b.lastPlayedAt || b.installed?.updatedAt || 0) - (a.lastPlayedAt || a.installed?.updatedAt || 0)
          );
      }
    });
    return list;
  }, [library, query, filter, sort]);

  if (library.length === 0) {
    return (
      <div className="view">
        <div className="empty-state empty-center">
          <div className="empty-title">No ports available</div>
          <div className="empty-text">No ports are supported on this platform yet.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      <div className="toolbar">
        <div className="toolbar-left">
          <h1 className="view-title">
            Library
            <span className="pill-count">{library.length}</span>
          </h1>
          <div className="toolbar-sep" />
          <div className="filter-tabs">
            <button
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-tab ${filter === 'installed' ? 'active' : ''}`}
              onClick={() => setFilter('installed')}
            >
              Installed
            </button>
            <button
              className={`filter-tab ${filter === 'not-installed' ? 'active' : ''}`}
              onClick={() => setFilter('not-installed')}
            >
              Not Installed
            </button>
            <button
              className={`filter-tab ${filter === 'attention' ? 'active' : ''}`}
              onClick={() => setFilter('attention')}
            >
              Needs Attention
            </button>
          </div>
        </div>
        <div className="toolbar-right">
          <span className="sort-label">Sort by:</span>
          <select
            className="sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
          >
            <option value="recent">Recent Activity</option>
            <option value="title">Title (A-Z)</option>
            <option value="version">Version</option>
            <option value="playtime">Play Time</option>
          </select>
          <div className="layout-toggle">
            <button
              className={`layout-toggle-btn ${layout === 'grid' ? 'active' : ''}`}
              title="Grid view"
              onClick={() => setLayout('grid')}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              className={`layout-toggle-btn ${layout === 'list' ? 'active' : ''}`}
              title="List view"
              onClick={() => setLayout('list')}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="mods-empty">
          {query ? 'No ports match your search.' : 'No ports match this filter.'}
        </div>
      )}

      {layout === 'grid' ? (
        <div className="grid">
          {filtered.map((entry) => (
            <div key={entry.port.id} className="grid-cell">
              <PortCard entry={entry} />
              <LaunchOutputPanel entry={entry} />
            </div>
          ))}
        </div>
      ) : (
        <div className="port-list">
          {filtered.map((entry) => (
            <div key={entry.port.id} className="grid-cell">
              <PortRow entry={entry} />
              <LaunchOutputPanel entry={entry} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
