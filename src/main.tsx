import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

// Global unhandled rejection safety handler for sandboxed preview
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = (event.reason?.message || event.reason?.stack || String(event.reason || '')) + '';
    if (msg.includes('WebSocket') || msg.includes('@vite/client')) {
      event.preventDefault();
    }
  });
}

// Safely register service worker for offline PWA functionality in production
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    registerSW({
      immediate: true,
      onRegisterError(err) {
        console.warn('PWA service worker registration error:', err);
      },
    });
  } catch (err) {
    console.warn('PWA registerSW failed:', err);
  }
}

