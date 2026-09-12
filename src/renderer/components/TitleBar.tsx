import { useEffect, useState } from 'react';
import { api } from '../api';

export function WindowControls() {
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
    <div className="window-controls">
      <button className="wc-btn" title="Minimize" aria-label="Minimize" onClick={() => void api.minimizeWindow()}>
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 12H4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        className="wc-btn"
        title={maximized ? 'Restore' : 'Maximize'}
        aria-label={maximized ? 'Restore' : 'Maximize'}
        onClick={() => void api.toggleMaximizeWindow()}
      >
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
      <button
        className="wc-btn wc-btn-close"
        title="Close"
        aria-label="Close"
        onClick={() => void api.closeWindow()}
      >
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
