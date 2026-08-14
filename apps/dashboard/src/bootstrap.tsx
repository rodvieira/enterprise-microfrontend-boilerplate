import { AuthProvider } from '@enterprise-mfe/auth';
import { createRoot } from 'react-dom/client';
import { App } from './exposed/App';
import './internal/styles.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('apps/dashboard: #root element not found in index.html.');
}

/**
 * Standalone dev entry has no shell to supply a basePath or an ancestor
 * <AuthProvider> — the dashboard must still render fully with no shell
 * present (spec edge case), so this is the one place `apps/dashboard`
 * establishes its own session. When composed inside the shell, App.tsx
 * relies on the shell's own <AuthProvider> instead — see
 * exposed/App.tsx's comment.
 */
createRoot(container).render(
  <AuthProvider>
    <App basePath="/" />
  </AuthProvider>,
);
