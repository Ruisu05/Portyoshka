import { useStore } from '../store';

export function Toasts() {
  const errors = useStore((s) => s.errors);
  const dismissError = useStore((s) => s.dismissError);

  return (
    <div className="toasts">
      {errors.map((toast, i) => (
        <div
          key={toast.id}
          className={`toast ${toast.kind === 'success' ? 'toast-success' : 'toast-error'}`}
          onClick={() => dismissError(i)}
        >
          <div className="toast-title">{toast.message}</div>
          {toast.detail && <div className="toast-detail">{toast.detail}</div>}
          {toast.code && <div className="toast-code">{toast.code}</div>}
        </div>
      ))}
    </div>
  );
}
