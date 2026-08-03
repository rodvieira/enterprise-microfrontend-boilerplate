import type { ButtonHTMLAttributes, Ref } from 'react';
import { cx } from '../utils/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  ref?: Ref<HTMLButtonElement>;
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-(--radius-control) font-medium ' +
  'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-(--color-brand-600) disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-(--color-brand-600) text-white hover:bg-(--color-brand-700)',
  secondary:
    'border border-(--color-border) bg-(--color-surface) text-(--color-text) hover:bg-(--color-surface-muted)',
  ghost: 'text-(--color-text) hover:bg-(--color-surface-muted)',
  danger: 'bg-(--color-danger-600) text-white hover:bg-(--color-danger-500)',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-(--spacing-control-x) text-sm',
  lg: 'h-12 px-5 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={cx(BASE, VARIANTS[variant], SIZES[size], className)} {...rest} />
  );
}
