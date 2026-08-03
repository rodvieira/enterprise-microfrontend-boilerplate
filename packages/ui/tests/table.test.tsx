import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Table } from '../src/components/table';

interface Row {
  id: string;
  name: string;
  role: string;
}

const rows: Row[] = [
  { id: '1', name: 'Ada', role: 'admin' },
  { id: '2', name: 'Grace', role: 'editor' },
];

const columns = [
  { key: 'name', header: 'Name', cell: (row: Row) => row.name },
  { key: 'role', header: 'Role', cell: (row: Row) => row.role },
];

describe('Table', () => {
  it('renders a real table with rows', () => {
    render(<Table columns={columns} rows={rows} getRowId={(row) => row.id} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('gives every header a scope, so screen readers can associate cells', () => {
    render(<Table columns={columns} rows={rows} getRowId={(row) => row.id} />);
    for (const header of screen.getAllByRole('columnheader')) {
      expect(header).toHaveAttribute('scope', 'col');
    }
  });

  it('renders the empty state for an empty collection, not a bare frame', () => {
    render(
      <Table
        columns={columns}
        rows={[]}
        getRowId={(row) => row.id}
        emptyState={<span>No users yet</span>}
      />,
    );
    expect(screen.getByText('No users yet')).toBeInTheDocument();
    expect(screen.queryByText('Ada')).not.toBeInTheDocument();
  });

  it('still says something deliberate when empty and given no emptyState', () => {
    render(<Table columns={columns} rows={[]} getRowId={(row) => row.id} />);
    expect(screen.getByText(/nothing to show/i)).toBeInTheDocument();
  });

  it('accepts a caption for context', () => {
    render(
      <Table columns={columns} rows={rows} getRowId={(row) => row.id} caption="Team members" />,
    );
    expect(screen.getByRole('table', { name: 'Team members' })).toBeInTheDocument();
  });

  it('forwards className', () => {
    render(<Table columns={columns} rows={rows} getRowId={(row) => row.id} className="mt-2" />);
    expect(screen.getByRole('table').className).toContain('mt-2');
  });
});
