import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Nav } from '../src/components/nav';

const items = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/admin', label: 'Admin' },
  { href: '/settings', label: 'Settings' },
];

describe('Nav', () => {
  it('renders a navigation landmark with one link per item', () => {
    render(<Nav items={items} activeHref="/dashboard" />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('marks the active item as current, not merely styled', () => {
    render(<Nav items={items} activeHref="/admin" />);
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  it('moves between items with the arrow keys', async () => {
    render(<Nav items={items} activeHref="/dashboard" />);
    const [dashboard, admin, settings] = screen.getAllByRole('link');

    await userEvent.tab();
    expect(dashboard).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    expect(admin).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    expect(settings).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    expect(dashboard).toHaveFocus(); // wraps

    await userEvent.keyboard('{ArrowUp}');
    expect(settings).toHaveFocus(); // wraps backward
  });

  it('keeps the whole list reachable with a single Tab stop', async () => {
    render(<Nav items={items} activeHref="/admin" />);
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveFocus();
  });

  it('forwards className', () => {
    render(<Nav items={items} activeHref="/admin" className="w-64" />);
    expect(screen.getByRole('navigation').className).toContain('w-64');
  });
});
