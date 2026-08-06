import { AuthProvider } from '@enterprise-mfe/auth';
import { createRoot } from 'react-dom/client';
import { App } from './exposed/App';
import './internal/styles.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('apps/admin: #root element not found in index.html.');
}

/**
 * Standalone dev entry has no shell to supply a basePath or an ancestor
 * <AuthProvider> — same pattern as apps/dashboard/src/bootstrap.tsx. When
 * composed inside the shell, App.tsx relies on the shell's own provider
 * instead (FR-005).
 */
createRoot(container).render(
  <AuthProvider>
    <App basePath="/" />
  </AuthProvider>,
);
