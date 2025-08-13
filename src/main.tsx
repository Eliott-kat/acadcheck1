import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import React from 'react'

if (import.meta.env.DEV) {
  console.log('[AcadCheck] Bootstrapping application');
  window.addEventListener('error', (e) => {
    console.error('[AcadCheck] GlobalError:', (e as ErrorEvent).error || (e as ErrorEvent).message || e);
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[AcadCheck] UnhandledRejection:', (e as PromiseRejectionEvent).reason);
  });
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  console.error('[AcadCheck] Root element not found');
} else {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  if (import.meta.env.DEV) {
    console.log('[AcadCheck] App rendered');
  }
}

