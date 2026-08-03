import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmount anything a test rendered. Focus assertions in packages/ui depend on a
// clean document between tests — a leftover tree keeps stealing focus.
afterEach(() => {
  cleanup();
});
