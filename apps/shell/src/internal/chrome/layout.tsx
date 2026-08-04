import { Layout, Nav } from '@enterprise-mfe/ui';
import type { ReactNode } from 'react';
import { SessionIndicator } from './session-indicator';

const NAV_ITEMS = [{ href: '/', label: 'Home' }];

export interface ShellLayoutProps {
  children: ReactNode;
}

/**
 * The frame: navigation, layout, and a session indicator, all composed from
 * @enterprise-mfe/ui — never from shell-defined chrome (FR-002). This is what
 * proves the design system compiled by a real bundler, not just exercised in
 * a test environment.
 */
export function ShellLayout({ children }: ShellLayoutProps) {
  return (
    <Layout
      header={
        <div
          style={{
            display: 'flex',
            width: '100%',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>enterprise-microfrontend-boilerplate</span>
          <SessionIndicator />
        </div>
      }
      sidebar={<Nav items={NAV_ITEMS} activeHref="/" />}
    >
      {children}
    </Layout>
  );
}
