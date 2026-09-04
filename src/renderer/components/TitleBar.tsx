import { useEffect, useState } from 'react';
import { api } from '../api';

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    void api.getWindowMaximized().then((result) => {
      if (result.ok) {
        setMaximized(result.data);
      }
    });
    return api.onWindowStateChange(setMaximized);
  }, []);

  return (
    <div className="titlebar" onDoubleClick={() => void api.toggleMaximizeWindow()}>
      <div className="titlebar-left">
        <div className="titlebar-logo">
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          >
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.28 1.28L3 12l5.8 1.9a2 2 0 0 1 1.28 1.28L12 21l1.9-5.8a2 2 0 0 1 1.28-1.28L21 12l-5.8-1.9a2 2 0 0 1-1.28-1.28L12 3z" />
          </svg>
        </div>
        <span className="titlebar-name">Portyoshka</span>
        <span className="titlebar-sep">|</span>
        <span className="titlebar-menu">
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
          <span>Window</span>
          <span>Help</span>
        </span>
      </div>
      <div className="titlebar-controls">
        <button className="titlebar-btn" title="Minimize" onClick={() => void api.minimizeWindow()}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 12H4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="titlebar-btn" title="Maximize" onClick={() => void api.toggleMaximizeWindow()}>
          {maximized ? (
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="7" y="7" width="10" height="10" rx="1" />
              <path d="M9 7V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          )}
        </button>
        <button className="titlebar-btn titlebar-btn-close" title="Close" onClick={() => void api.closeWindow()}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
