import { ProtectedRoute } from '../session/protected-route';

export function HomeRoute() {
  return (
    <ProtectedRoute fallback={<p>Sign in to see the welcome area.</p>}>
      <p>Welcome back.</p>
    </ProtectedRoute>
  );
}
