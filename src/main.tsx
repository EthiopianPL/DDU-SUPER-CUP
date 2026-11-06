
import { bootLeague } from "./data/live";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

// Register PWA Service Worker
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Auto-update check
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available; will activate on next refresh or skipWaiting
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('PWA service worker registration failed:', err);
      });
  });
}

bootLeague().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
