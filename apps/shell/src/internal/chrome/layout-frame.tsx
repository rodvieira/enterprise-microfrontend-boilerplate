import type { WithClassName } from '@enterprise-mfe/shared-types';
import type { ReactNode } from 'react';
import { cx } from './cx';

export interface LayoutFrameProps extends WithClassName {
  header?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * The frame the orchestrator draws around whichever remote is mounted.
 *
 * Its structural classes come from frame.css, not from Tailwind utilities.
 * That file explains why: a remote's stylesheet loads after the host's and can
 * otherwise win the cascade against a responsive utility the host depends on.
 * Colour and border utilities stay inline — a remote emitting the same
 * declaration changes nothing.
 */
export function LayoutFrame({ header, sidebar, footer, children, className }: LayoutFrameProps) {
  return (
    <div className={cx('shell-frame bg-(--color-surface) text-(--color-text)', className)}>
      {header ? (
        <header className="flex h-14 items-center border-b border-(--color-border) px-4">
          {header}
        </header>
      ) : null}

      <div className="shell-frame-body">
        {sidebar ? (
          <aside className="shell-frame-sidebar border-b border-(--color-border) md:border-r md:border-b-0">
            {sidebar}
          </aside>
        ) : null}
        <main className="shell-frame-main">{children}</main>
      </div>

      {footer ? (
        <footer className="border-t border-(--color-border) px-4 py-3 text-sm text-(--color-text-muted)">
          {footer}
        </footer>
      ) : null}
    </div>
  );
}
