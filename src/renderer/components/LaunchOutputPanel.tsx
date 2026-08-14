import { useEffect, useRef } from 'react';
import type { LibraryEntry } from '../../shared/types';
import { useStore } from '../store';

export function LaunchOutputPanel({ entry }: { entry: LibraryEntry }) {
  const logs = useStore((s) => s.logs[entry.port.id] ?? []);
  const visible = useStore((s) => s.visibleLogs[entry.port.id] ?? false);
  const lastExit = useStore((s) => s.lastExit[entry.port.id]);
  const exportLog = useStore((s) => s.exportLog);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [logs.length, visible]);

  if (!visible) return null;

  return (
    <div className="log-panel">
      <div className="log-header">
        <span>Game output</span>
        <button className="btn btn-ghost log-export-btn" onClick={() => void exportLog(entry.port.id)}>
          Export log
        </button>
      </div>
      <pre className="log-body">
        {logs.length === 0 && <span className="log-empty">No output yet.</span>}
        {logs.map((line, i) => (
          <span key={i} className={line.stream === 'stderr' ? 'log-stderr' : 'log-stdout'}>
            {line.data}
          </span>
        ))}
        {lastExit && lastExit.failed && (
          <span className="log-crash">
            {lastExit.signal
              ? `\nProcess was killed by ${lastExit.signal}.`
              : `\nProcess exited with code ${lastExit.code ?? 'unknown'}.`}
            {lastExit.signal === 'SIGSEGV' ? ' This looks like a crash inside the game itself.' : ''}
            {lastExit.code === null && !lastExit.signal ? ' It could not be started.' : ''}
          </span>
        )}
        <div ref={bottomRef} />
      </pre>
    </div>
  );
}
