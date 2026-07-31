import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Prevent zooming (pinch-to-zoom, double-tap zoom, and desktop keyboard/wheel shortcuts)
document.addEventListener('touchstart', (e) => {
  if (e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener('gesturestart', (e) => {
  e.preventDefault();
});

document.addEventListener('gesturechange', (e) => {
  e.preventDefault();
});

// Block Ctrl/Cmd + scroll (pinch zoom on trackpads)
document.addEventListener('wheel', (e) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
  }
}, { passive: false });



// Handle stale chunk script errors after new deployments
window.addEventListener('error', (e) => {
  const isModuleError = e.message && (
    e.message.includes('Failed to fetch dynamically imported module') ||
    e.message.includes('Expected a JavaScript-or-Wasm module script') ||
    e.message.includes('Importing a module script failed')
  );
  if (isModuleError) {
    const key = 'ep_chunk_reload_' + (e.filename || 'unknown');
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, 'true');
      window.location.reload();
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
