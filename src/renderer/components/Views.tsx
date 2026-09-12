import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { PortCard, PortRow } from './PortCard';
import { LaunchOutputPanel } from './LaunchOutputPanel';
import type { LibraryEntry } from '../../shared/types';

type Filter = 'all' | 'installed' | 'not-installed' | 'attention';

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
  const setQuery = useStore((s) => s.setLibraryQuery);
  const filter = useStore((s) => s.libraryFilter);
  const setFilter = useStore((s) => s.setLibraryFilter);
  const sort = useStore((s) => s.librarySort);
  const setSort = useStore((s) => s.setLibrarySort);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  const counts = useMemo(
    () => ({
      all: library.length,
      installed: library.filter((entry) => entry.installed !== null).length,
      'not-installed': library.filter((entry) => entry.installed === null).length,
      attention: library.filter(needsAttention).length,
    }),
    [library],
  );

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
        <div className="empty is-page">
          <div className="empty-title">No ports here yet</div>
          <div className="empty-text">
            Portyoshka has no ports registered for this platform. Check back after a future release.
          </div>
        </div>
      </div>
    );
  }

  const filterLabels: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'installed', label: 'Installed' },
    { id: 'not-installed', label: 'Not installed' },
    { id: 'attention', label: 'Needs attention' },
  ];

  return (
    <div className="view">
      <h1 className="visually-hidden">Library</h1>
      <div className="toolbar">
        <div className="filters" role="group" aria-label="Filter ports">
          {filterLabels.map(({ id, label }) => (
            <button
              key={id}
              className={`filter ${filter === id ? 'is-active' : ''}`}
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
              <span className="filter-count">{counts[id]}</span>
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <select
            className="sort-select"
            value={sort}
            aria-label="Sort ports"
            onChange={(e) => setSort(e.target.value as typeof sort)}
          >
            <option value="recent">Recent activity</option>
            <option value="title">Title (A-Z)</option>
            <option value="version">Version</option>
            <option value="playtime">Play time</option>
          </select>
          <div className="seg" role="group" aria-label="Layout">
            <button
              className={`seg-btn ${layout === 'grid' ? 'is-active' : ''}`}
              title="Grid view"
              aria-label="Grid view"
              onClick={() => setLayout('grid')}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              className={`seg-btn ${layout === 'list' ? 'is-active' : ''}`}
              title="List view"
              aria-label="List view"
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
        <div className="empty">
          <div className="empty-title">{query ? 'Nothing matches your search' : 'No ports in this filter'}</div>
          <div className="empty-text">
            {query
              ? `No port, game or description matches “${query.trim()}”.`
              : 'Every port here is outside this filter right now.'}
          </div>
          <button
            className="btn"
            onClick={() => {
              if (query) {
                setQuery('');
              } else {
                setFilter('all');
              }
            }}
          >
            {query ? 'Clear search' : 'Show all ports'}
          </button>
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
