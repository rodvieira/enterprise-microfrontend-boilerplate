import type { InputHTMLAttributes, Ref } from 'react';
import { useId } from 'react';
import { cx } from '../utils/cx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * Required. An input without a programmatically associated label is an
   * accessibility defect, so the contract does not allow one to be built.
   */
  label: string;
  error?: string;
  hint?: string;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ label, error, hint, id, className, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-(--color-text)">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          'h-10 rounded-(--radius-control) border bg-(--color-surface) px-(--spacing-control-x)',
          'text-(--color-text) placeholder:text-(--color-text-muted)',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-brand-600)',
          error ? 'border-(--color-danger-500)' : 'border-(--color-border)',
          className,
        )}
        {...rest}
      />
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
