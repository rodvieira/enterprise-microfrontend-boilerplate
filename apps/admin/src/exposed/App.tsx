import { Button } from '@enterprise-mfe/ui';
import '../internal/styles.css';

/**
 * Placeholder smoke element proving the Tailwind pipeline holds on a third
 * app (T016). Replaced with the real exposed component (RemoteAppProps,
 * useAuth, the user table, the invite/edit modal) in later phases.
 *
 * The styles.css import lives here, not only in bootstrap.tsx, and this
 * file already has a default export — both are 003-dashboard-remote
 * findings applied from day one (docs/architecture.md "Remotes" section),
 * not rediscovered.
 */
export function App() {
  return <Button>Admin</Button>;
}

export default App;
