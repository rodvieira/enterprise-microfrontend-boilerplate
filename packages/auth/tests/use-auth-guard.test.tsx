import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from '../src/context';

function Orphan() {
  useAuth();
  return null;
}

describe('useAuth outside a provider', () => {
  it('throws an error that names the missing provider', () => {
    // React logs the error boundary trace; silence it so the run stays readable.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => render(<Orphan />)).toThrowError(/AuthProvider/);
    } finally {
      consoleError.mockRestore();
    }
  });

  it('fails loudly rather than defaulting to a signed-out session', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      // A silent default would let a component tree believe it is signed out
      // forever, and would hide a second, accidentally mounted provider.
      expect(() => render(<Orphan />)).toThrow();
    } finally {
      consoleError.mockRestore();
    }
  });
});
