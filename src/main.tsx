import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './i18n';
import './index.css';

// Global handler for unhandled promise rejections to avoid noisy third-party
// network errors (like 'Failed to fetch') flooding the console. We still
// log a concise warning so developers can investigate if needed.
if (typeof window !== 'undefined') {
  // Wrap fetch to intercept network failures and log minimal warning.
  try {
    const _origFetch = window.fetch.bind(window);
    window.fetch = async (...args: any[]) => {
      try {
        return await _origFetch(...args);
      } catch (err: any) {
        const msg = String(err?.message || err || '');
        if (msg.includes('Failed to fetch')) {
          // eslint-disable-next-line no-console
          console.warn('Network request failed (fetch) — suppressed repetitive error.');
        }
        throw err;
      }
    };
  } catch (e) {
    // ignore if we cannot override fetch
  }

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
