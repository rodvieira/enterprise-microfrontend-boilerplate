import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmount anything a test rendered. Focus assertions in component tests depend on a
// clean document between tests — a leftover tree keeps stealing focus.
afterEach(() => {
  cleanup();
});

// jsdom implements neither ResizeObserver nor real element layout — without
// this, recharts' ResponsiveContainer (apps/dashboard's activity chart) sees
// a permanent 0x0 container and never renders its children at all, in every
// project, not just dashboard's. A no-op observer plus fixed dimensions is
// the standard workaround; real sizing is a browser concern the Playwright
// e2e suite covers instead (apps/shell/e2e).
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// biome-ignore lint/suspicious/noExplicitAny: matches the DOM lib's own ResizeObserver global, which jsdom does not define
(globalThis as any).ResizeObserver ??= ResizeObserverMock;

Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  configurable: true,
  value: 500,
});
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  value: 300,
});
Element.prototype.getBoundingClientRect = () =>
  ({
    width: 500,
    height: 300,
    top: 0,
    left: 0,
    right: 500,
    bottom: 300,
    x: 0,
    y: 0,
    toJSON() {},
  }) as DOMRect;
