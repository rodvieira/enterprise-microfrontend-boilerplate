import type { ReactNode, Ref, SelectHTMLAttributes } from 'react';
import { useId } from 'react';
import { cx } from './cx';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /**
   * Required, for the same reason Input requires one: a control without a
   * programmatically associated label is an accessibility defect, and the
   * contract does not allow one to be built.
   */
  label: string;
  error?: string;
  hint?: string;
  /** `<option>` elements. Kept as children rather than an `options` array so
   * grouping (`<optgroup>`) and per-option attributes stay available. */
  children: ReactNode;
  ref?: Ref<HTMLSelectElement>;
}

/**
 * The same contract as Input, for a native `<select>`.
 *
 * It exists because it was already being written by hand: three copies of a
 * bare `<select>` with copy-pasted Tailwind lived in the admin remote, each
 * missing the focus ring and the error/hint wiring Input has — a design
 * system that does not cover its own demo's forms pushes every consumer into
 * rebuilding this, slightly differently each time.
 */
export function Select({ label, error, hint, id, className, children, ...rest }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-sm font-medium text-(--color-text)">
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          'h-10 rounded-(--radius-control) border bg-(--color-surface) px-(--spacing-control-x)',
          'text-(--color-text)',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-brand-600)',
          error ? 'border-(--color-danger-500)' : 'border-(--color-border)',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-(--color-danger-600)">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-(--color-text-muted)">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
