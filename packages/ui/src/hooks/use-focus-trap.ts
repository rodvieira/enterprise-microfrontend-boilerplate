import type { RefObject } from 'react';
import { useEffect } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) =>
      !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true',
  );
}

/**
 * Focus management for a modal surface: move focus in, keep it in, put it back.
 *
 * Hand-rolled rather than taken from a headless dialog library — research
 * decision D3. The five rules this implements are covered one test each in
 * `tests/modal-focus.test.tsx`; if they start failing in a way that is awkward
 * to fix here, that is the signal to reconsider D3 rather than to patch around it.
 */
export function useFocusTrap(active: boolean, containerRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    // Rule 4: remember where focus came from, so it can be given back.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Rule 1: focus the first focusable element, or the container itself.
    const initial = focusableWithin(container)[0];
    if (initial) {
      initial.focus();
    } else {
      container.focus();
    }

    // Rule 2: Tab and Shift+Tab cycle within the container.
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !container) return;
      const items = focusableWithin(container);
      if (items.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = items[0] as HTMLElement;
      const last = items[items.length - 1] as HTMLElement;
      const current = document.activeElement;

      if (event.shiftKey && (current === first || current === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      previouslyFocused?.focus();
    };
  }, [active, containerRef]);
}

/**
 * Rule 5: hide everything outside the modal from assistive technology while it
 * is open, and restore whatever each element declared before.
 */
export function useInertBackground(
  active: boolean,
  exceptRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!active) return;
    const exception = exceptRef.current;
    const siblings = Array.from(document.body.children).filter(
      (child) => child !== exception && !child.contains(exception),
    );
    const previous = siblings.map((element) => element.getAttribute('aria-hidden'));

    for (const element of siblings) {
      element.setAttribute('aria-hidden', 'true');
    }

    return () => {
      siblings.forEach((element, index) => {
        const value = previous[index];
        if (value === null || value === undefined) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', value);
        }
      });
    };
  }, [active, exceptRef]);
}
