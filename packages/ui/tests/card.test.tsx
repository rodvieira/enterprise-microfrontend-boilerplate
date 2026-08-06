import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from '../src/components/card';

describe('Card', () => {
  it('renders a label and value', () => {
    render(<Card label="Active users" value="1,204" />);
    expect(screen.getByText('Active users')).toBeInTheDocument();
    expect(screen.getByText('1,204')).toBeInTheDocument();
  });

  it.each([
    ['up', '▲'],
    ['down', '▼'],
    ['flat', '▬'],
  ] as const)('renders the %s trend indicator', (trend, symbol) => {
    render(<Card label="Usage trend" value="+4%" trend={trend} />);
    expect(screen.getByText(symbol)).toBeInTheDocument();
  });

  it('renders no trend indicator when none is given', () => {
    render(<Card label="Active users" value="1,204" />);
    expect(screen.queryByText('▲')).not.toBeInTheDocument();
    expect(screen.queryByText('▼')).not.toBeInTheDocument();
    expect(screen.queryByText('▬')).not.toBeInTheDocument();
  });

  it('forwards className', () => {
    const { container } = render(<Card label="Active users" value="1,204" className="mt-2" />);
    expect(container.firstElementChild?.className).toContain('mt-2');
  });
});
