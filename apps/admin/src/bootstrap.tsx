import { createRoot } from 'react-dom/client';
import { App } from './exposed/App';
import { standaloneBus, standaloneSession } from './internal/standalone-host';
import './internal/styles.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('apps/admin: #root element not found in index.html.');
}

/**
 * Standalone dev entry: no host, so nothing supplies `session` or `bus`.
 * This remote must still render fully on its own — that is what lets it live
 * in its own repository — so local stand-ins are passed instead. When
 * composed by the orchestrator, those same props come from the host.
 */
createRoot(container).render(<App basePath="/" session={standaloneSession} bus={standaloneBus} />);
