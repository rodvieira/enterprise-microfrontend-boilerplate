import type { WithClassName } from '@enterprise-mfe/shared-types';
import type { ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import { useFocusTrap, useInertBackground } from './use-focus-trap';

export interface ModalProps extends WithClassName {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useFocusTrap(open, surfaceRef);
  useInertBackground(open, portalRef);

  // Rule 3: Escape closes.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div ref={portalRef} className="fixed inset-0 z-50 flex items-center justify-center">
      {/*
        Clicking the backdrop closes. It is deliberately not a keyboard target:
        it is aria-hidden and outside the focus trap, and Escape is the keyboard
        route to the same action (rule 3). Adding a key handler here would put a
        second, unreachable control in the accessibility tree.
      */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape provides the keyboard path; see above. */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      {/*
        A div with role="dialog" rather than the native <dialog> element: this
        component manages focus and background inertness explicitly (rules 1-5),
        and <dialog>.showModal() would take over that behavior with uneven
        support in the jsdom environment those five rules are tested in.
        Biome's useSemanticElements is switched off for this one file in
        biome.json, since a suppression comment cannot attach to a JSX attribute.
      */}
      <div
        ref={surfaceRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'relative z-10 max-h-[85vh] w-full max-w-lg overflow-auto rounded-(--radius-surface)',
          'border border-(--color-border) bg-(--color-surface) p-5 shadow-xl outline-none',
          className,
        )}
      >
        <h2 id={titleId} className="pr-10 text-lg font-semibold text-(--color-text)">
          {title}
        </h2>
        <div className="mt-3 text-(--color-text)">{children}</div>
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
        {/*
          Rendered last on purpose: the close control sits visually in the corner
          but comes after the content in DOM order, so opening the modal lands
          focus on the content rather than on "close", and reading order is
          content-first.
        */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className={cx(
            'absolute top-4 right-4 flex h-8 w-8 items-center justify-center',
            'rounded-(--radius-control) text-(--color-text-muted) hover:bg-(--color-surface-muted)',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-brand-600)',
          )}
        >
          ×
        </button>
      </div>
    </div>,
    document.body,
  );
}
