import type { User } from '@enterprise-mfe/shared-types';
import { Button } from '../ui/button';
import { Table } from '../ui/table';
import type { TableColumn } from '../ui/table';
import type { SortColumn, SortDirection } from './use-user-list';

export interface UserTableProps {
  users: readonly User[];
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
}

function sortIndicator(active: boolean, direction: SortDirection): string {
  if (!active) return '';
  return direction === 'asc' ? ' ▲' : ' ▼';
}

/** Wraps the shared design system's Table — no bespoke table markup. */
export function UserTable({ users, sortColumn, sortDirection, onSort }: UserTableProps) {
  function header(label: string, column: SortColumn) {
    const active = sortColumn === column;
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => onSort(column)}>
        {label}
        {sortIndicator(active, sortDirection)}
      </Button>
    );
  }

  const columns: readonly TableColumn<User>[] = [
    { key: 'name', header: header('Name', 'name'), cell: (user) => user.name },
    { key: 'email', header: header('Email', 'email'), cell: (user) => user.email },
    { key: 'role', header: header('Role', 'role'), cell: (user) => user.role },
  ];

  return (
    <Table
      columns={columns}
      rows={users}
      getRowId={(user) => user.id}
      emptyState={<span>No users.</span>}
      caption="Users"
    />
  );
}
