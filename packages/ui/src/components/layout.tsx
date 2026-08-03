import type { WithClassName } from '@enterprise-mfe/shared-types';
import type { ReactNode } from 'react';
import { cx } from '../utils/cx';

export interface LayoutProps extends WithClassName {
  header?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function Layout({ header, sidebar, footer, children, className }: LayoutProps) {
  return (
    <div
      className={cx('flex min-h-full flex-col bg-(--color-surface) text-(--color-text)', className)}
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
