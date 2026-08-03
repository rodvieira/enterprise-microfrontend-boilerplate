import type { ReactNode } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { ToastOptions, ToastRecord, ToastVariant } from '../hooks/use-toast';
import { ToastContext } from '../hooks/use-toast';
import { cx } from '../utils/cx';

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  info: 'border-(--color-border)',
  success: 'border-(--color-success-500)',
  warning: 'border-(--color-warning-500)',
  danger: 'border-(--color-danger-500)',
};

export interface ToastProviderProps {
  children: ReactNode;
  /** Default milliseconds before a toast dismisses itself. `0` disables auto-dismiss. */
  defaultDuration?: number;
}

export function ToastProvider({ children, defaultDuration = 0 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<readonly ToastRecord[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      const id = `toast-${nextId.current++}`;
      setToasts((current) => [...current, { ...options, id }]);

      const duration = options.duration ?? defaultDuration;
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [defaultDuration, dismiss],
  );

  const value = useMemo(() => ({ show, dismiss, toasts }), [show, dismiss, toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/*
        One polite live region for the whole queue. Polite rather than assertive:
        a saved-confirmation should not interrupt what someone is reading.
      */}
      <output
        aria-live="polite"
        aria-relevant="additions text"
        className="fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cx(
              'flex items-start gap-3 rounded-(--radius-surface) border-l-4',
              'border border-(--color-border) bg-(--color-surface) p-3 shadow-lg',
              VARIANT_CLASSES[toast.variant ?? 'info'],
            )}
          >
            <div className="flex-1">
              <p className="font-medium text-(--color-text)">{toast.title}</p>
              {toast.description ? (
                <p className="text-sm text-(--color-text-muted)">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label={`Dismiss ${toast.title}`}
              className="text-(--color-text-muted) hover:text-(--color-text)"
            >
              ×
            </button>
          </div>
        ))}
      </output>
    </ToastContext.Provider>
  );
}
