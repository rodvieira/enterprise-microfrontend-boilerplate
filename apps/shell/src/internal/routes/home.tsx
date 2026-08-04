import { ProtectedRoute } from '@enterprise-mfe/auth';

export function HomeRoute() {
  return (
    <ProtectedRoute fallback={<p>Sign in to see the welcome area.</p>}>
      <p>Welcome back.</p>
    </ProtectedRoute>
  );
}
