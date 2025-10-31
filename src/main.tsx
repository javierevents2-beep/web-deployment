import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './i18n';
import './index.css';

// Global handler for unhandled promise rejections to avoid noisy third-party
// network errors (like 'Failed to fetch') flooding the console. We still
// log a concise warning so developers can investigate if needed.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (ev) => {
    try {
      const reason = (ev && (ev as any).reason) || '';
      const msg = String(reason?.message || reason || '');
      if (msg.includes('Failed to fetch')) {
        // Minimal log to avoid noisy long stacks from third-party libs.
        // eslint-disable-next-line no-console
        console.warn('Network request failed (Failed to fetch) — this may be a transient issue or caused by blocked network calls.');
        ev.preventDefault();
      }
    } catch (e) {
      // ignore
    }
  });

  window.addEventListener('error', (ev) => {
    try {
      const msg = String((ev && (ev as any).message) || '');
      if (msg && msg.includes('Failed to fetch')) {
        // eslint-disable-next-line no-console
        console.warn('Network request failed (Failed to fetch) — suppressed repetitive error.');
      }
    } catch (e) {}
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
