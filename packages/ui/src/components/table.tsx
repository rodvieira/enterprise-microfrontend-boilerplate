import type { WithClassName } from '@enterprise-mfe/shared-types';
import type { ReactNode } from 'react';
import { cx } from '../utils/cx';

export interface TableColumn<Row> {
  key: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
}

export interface TableProps<Row> extends WithClassName {
  columns: readonly TableColumn<Row>[];
  rows: readonly Row[];
  getRowId: (row: Row) => string;
  /** Shown instead of rows when the collection is empty. */
  emptyState?: ReactNode;
  caption?: ReactNode;
}

export function Table<Row>({
  columns,
  rows,
  getRowId,
  emptyState,
  caption,
  className,
}: TableProps<Row>) {
  return (
    <table
      className={cx(
        'w-full border-collapse text-left text-sm text-(--color-text)',
        'rounded-(--radius-surface) border border-(--color-border)',
        className,
      )}
    >
      {caption ? (
        // <caption> is center-aligned by the browser's own default
        // stylesheet — every consumer needs the override, not just this one.
        <caption className="p-3 text-left font-medium text-(--color-text)">{caption}</caption>
      ) : null}
      <thead className="bg-(--color-surface-muted)">
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col" className="px-3 py-2 font-medium">
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={columns.length}
              className="px-3 py-8 text-center text-(--color-text-muted)"
            >
              {emptyState ?? 'Nothing to show yet.'}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={getRowId(row)} className="border-t border-(--color-border)">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-2">
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
