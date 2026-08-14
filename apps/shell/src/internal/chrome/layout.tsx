import { Layout, Nav } from '@enterprise-mfe/ui';
import type { NavItem } from '@enterprise-mfe/ui';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { useRegisteredRemotes } from './registered-remotes-context';
import { SessionIndicator } from './session-indicator';

const HOME_ITEM: NavItem = { href: '/', label: 'Home' };

/** Exact match for '/', a path-segment-aware prefix match for everything else. */
function isActiveHref(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface ShellLayoutProps {
  children: ReactNode;
}

/**
 * The frame: navigation, layout, and a session indicator, all composed from
 * @enterprise-mfe/ui — never from shell-defined chrome. This is what
 * proves the design system compiled by a real bundler, not just exercised in
 * a test environment.
 *
 * Nav links for remotes are read from RegisteredRemotesContext, not
 * hardcoded — the same `registered` list origin-guard already vetted
 * (App.tsx), so the nav can never link to a remote that was refused.
 */
export function ShellLayout({ children }: ShellLayoutProps) {
  const location = useLocation();
  const registeredRemotes = useRegisteredRemotes();

  const navItems: NavItem[] = [
    HOME_ITEM,
    ...registeredRemotes.map((remote) => ({ href: remote.routePath, label: remote.label })),
  ];
  const activeHref =
    navItems.find((item) => isActiveHref(item.href, location.pathname))?.href ?? '/';

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
      sidebar={<Nav items={navItems} activeHref={activeHref} />}
    >
      {children}
    </Layout>
  );
}
