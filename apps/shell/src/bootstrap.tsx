import { createRoot } from 'react-dom/client';
import { App } from './exposed/App';
import './internal/styles.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('apps/shell: #root element not found in index.html.');
}

createRoot(container).render(<App />);
