import { AuthProvider, ProtectedRoute } from '@enterprise-mfe/auth';
import { useEffect } from 'react';
import { ShellLayout } from '../internal/chrome/layout';
import { fetchRegistry } from '../internal/federation/manifest';

/**
 * What bootstrap.tsx mounts. This is the shell's public entry, the same
 * exposed/ vs internal/ split every remote uses (constitution Principle I) —
 * even though the shell exposes nothing over federation today.
 */
export function App() {
  useEffect(() => {
    // Fire-and-forget: the frame renders immediately and never waits on this
    // (FR-001, research D3 consequences). Sprint 4 wires the result into
    // routing; this sprint proves the fetch-and-validate mechanism runs.
    fetchRegistry().catch((error: unknown) => {
      console.error(error);
    });
  }, []);

  return (
    <AuthProvider>
      <ShellLayout>
        <ProtectedRoute fallback={<p>Sign in to see the welcome area.</p>}>
          <p>Welcome back.</p>
        </ProtectedRoute>
      </ShellLayout>
    </AuthProvider>
  );
}
