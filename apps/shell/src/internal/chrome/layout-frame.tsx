import type { WithClassName } from '@enterprise-mfe/shared-types';
import type { ReactNode } from 'react';
import { cx } from './cx';

export interface LayoutFrameProps extends WithClassName {
  header?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function LayoutFrame({ header, sidebar, footer, children, className }: LayoutFrameProps) {
  return (
    <div
      // min-h-dvh, not min-h-full: `min-height: 100%` only resolves when
      // every ancestor has a height, and nothing sets one on html/body/#root
      // — so it collapsed to the content's height and left the page's own
      // background showing underneath. dvh also tracks mobile browser chrome,
      // which vh does not.
      className={cx('flex min-h-dvh flex-col bg-(--color-surface) text-(--color-text)', className)}
    >
      {header ? (
        <header className="flex h-14 items-center border-b border-(--color-border) px-4">
          {header}
        </header>
      ) : null}

      <div className="flex flex-1 flex-col md:flex-row">
        {sidebar ? (
          <aside className="border-b border-(--color-border) p-4 md:w-64 md:border-r md:border-b-0">
            {sidebar}
          </aside>
        ) : null}
        <main className="flex-1 p-4">{children}</main>
      </div>

      {footer ? (
        <footer className="border-t border-(--color-border) px-4 py-3 text-sm text-(--color-text-muted)">
          {footer}
        </footer>
      ) : null}
    </div>
  );
}
