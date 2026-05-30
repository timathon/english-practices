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



createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
