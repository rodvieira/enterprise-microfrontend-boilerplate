import type { WithClassName } from '@enterprise-mfe/shared-types';
import type { KeyboardEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { cx } from '../utils/cx';

export interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
}

export interface NavProps extends WithClassName {
  items: readonly NavItem[];
  activeHref: string;
}

/**
 * Roving tabindex: the list is one Tab stop, and the arrow keys move within it.
 * Tabbing through every item of a long navigation is the behavior this avoids.
 */
export function Nav({ items, activeHref, className }: NavProps) {
  const activeIndex = Math.max(
    items.findIndex((item) => item.href === activeHref),
    0,
  );
  const [focusedIndex, setFocusedIndex] = useState(activeIndex);
  const refs = useRef<Array<HTMLAnchorElement | null>>([]);
  const shouldRestoreFocus = useRef(false);

  useEffect(() => {
    if (!shouldRestoreFocus.current) return;
    shouldRestoreFocus.current = false;
    refs.current[focusedIndex]?.focus();
  }, [focusedIndex]);

  function move(delta: number) {
    setFocusedIndex((current) => (current + delta + items.length) % items.length);
    shouldRestoreFocus.current = true;
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setFocusedIndex(0);
      shouldRestoreFocus.current = true;
    } else if (event.key === 'End') {
      event.preventDefault();
      setFocusedIndex(items.length - 1);
      shouldRestoreFocus.current = true;
    }
  }

  return (
    <nav className={cx('flex flex-col gap-1', className)} onKeyDown={onKeyDown}>
      {items.map((item, index) => {
        const isActive = item.href === activeHref;
        return (
          <a
            key={item.href}
            href={item.href}
            ref={(node) => {
              refs.current[index] = node;
            }}
            tabIndex={index === focusedIndex ? 0 : -1}
            aria-current={isActive ? 'page' : undefined}
            className={cx(
              'flex items-center gap-2 rounded-(--radius-control) px-3 py-2 text-sm',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-brand-600)',
              isActive
                ? 'bg-(--color-brand-50) font-medium text-(--color-brand-700)'
                : 'text-(--color-text-muted) hover:bg-(--color-surface-muted)',
            )}
          >
            {item.icon}
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
